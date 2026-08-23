import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Employment } from "@patrimoine-jeu/db";
import {
  CYCLES_PER_YEAR,
  getCareerTier,
  NPC_JOBS,
  NPC_JOB_LIST,
  type CreateJobPostingInput,
  type JobId,
} from "@patrimoine-jeu/domain";
import {
  clampStat,
  computePersonalInvestmentLevel,
  computePressureDrain,
  computeReconversionPenalty,
} from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { AchievementsService } from "../engagement/achievements.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

interface ShareLike {
  playerId: string;
  sharePercentage: { toNumber(): number };
}

@Injectable()
export class EmploymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
    private readonly achievementsService: AchievementsService,
  ) {}

  async listJobs(playerId: string) {
    const [sectorExperience, currentEmployment, stats] = await Promise.all([
      this.prisma.client.playerSectorExperience.findMany({ where: { playerId } }),
      this.prisma.client.employment.findFirst({ where: { playerId, endedCycle: null } }),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);

    const cyclesBySector = new Map(sectorExperience.map((entry) => [entry.sector, entry.cycles]));
    const currentSector = currentEmployment?.jobId
      ? NPC_JOBS[currentEmployment.jobId as JobId]?.sector
      : undefined;
    const nutritionLevel = computePersonalInvestmentLevel(stats?.nutritionInvestment.toNumber() ?? 0);

    return Promise.all(
      NPC_JOB_LIST.map(async (job) => {
        const sectorCycles = cyclesBySector.get(job.sector) ?? 0;
        const isSectorChange = currentSector !== undefined && currentSector !== job.sector;
        const careerTier = getCareerTier(sectorCycles);

        return {
          ...job,
          estimatedNetPerCycle: await this.cyclesService.estimateNetPerCycle(
            job.annualGrossSalary * careerTier.salaryMultiplier,
          ),
          estimatedWellbeingDrainPerCycle: computePressureDrain(job.pressure, sectorCycles, nutritionLevel),
          sectorExperienceCycles: sectorCycles,
          reconversionPenalty: isSectorChange ? computeReconversionPenalty(sectorCycles) : 0,
          careerTier: {
            id: careerTier.tier.id,
            label: careerTier.tier.label,
            salaryMultiplier: careerTier.salaryMultiplier,
            nextTierLabel: careerTier.nextTier?.label ?? null,
            cyclesToNextTier: careerTier.cyclesToNextTier,
          },
        };
      }),
    );
  }

  async getCurrentEmployment(playerId: string) {
    const employment = await this.prisma.client.employment.findFirst({
      where: { playerId, endedCycle: null },
      orderBy: { startedCycle: "desc" },
    });

    return employment ? this.toEmploymentView(playerId, employment) : null;
  }

  async takeJob(playerId: string, jobId: JobId) {
    const job = NPC_JOBS[jobId];
    if (!job) {
      throw new NotFoundException(`Emploi ${jobId} inconnu`);
    }

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    const salaryPerCycle = job.annualGrossSalary / CYCLES_PER_YEAR;

    const previousEmployment = await this.prisma.client.employment.findFirst({
      where: { playerId, endedCycle: null },
    });
    const previousJob = previousEmployment?.jobId ? NPC_JOBS[previousEmployment.jobId as JobId] : undefined;

    let reconversionPenalty = 0;
    if (previousJob && previousJob.sector !== job.sector) {
      const priorExperience = await this.prisma.client.playerSectorExperience.findUnique({
        where: { playerId_sector: { playerId, sector: job.sector } },
      });
      reconversionPenalty = computeReconversionPenalty(priorExperience?.cycles ?? 0);
    }

    const employment = await this.prisma.client.$transaction(async (tx) => {
      await tx.employment.updateMany({
        where: { playerId, endedCycle: null },
        data: { endedCycle: openCycle.number },
      });

      const created = await tx.employment.create({
        data: {
          playerId,
          employerType: "SYSTEM_NPC",
          jobId,
          role: job.title,
          salary: salaryPerCycle,
          startedCycle: openCycle.number,
        },
      });

      if (reconversionPenalty > 0) {
        const stats = await tx.playerStats.findUnique({ where: { playerId } });
        if (stats) {
          await tx.playerStats.update({
            where: { playerId },
            data: { wellbeing: clampStat(stats.wellbeing.toNumber() - reconversionPenalty) },
          });
        }
      }

      return created;
    });

    await this.achievementsService.tryUnlock(playerId, "first-job");

    return { ...(await this.toEmploymentView(playerId, employment)), reconversionPenalty };
  }

  async quitJob(playerId: string): Promise<{ quit: boolean }> {
    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    const employment = await this.prisma.client.employment.findFirst({ where: { playerId, endedCycle: null } });
    if (!employment) {
      return { quit: false };
    }

    await this.prisma.client.employment.update({
      where: { id: employment.id },
      data: { endedCycle: openCycle.number },
    });

    if (employment.employerType === "COMPANY") {
      await this.notifyEmployerAndReopenPosting(employment, openCycle.number, "a démissionné");
    }

    // Le statut d'indépendant complémentaire suppose une activité
    // principale active (cf. domain/independent-activity.ts) — perdre son
    // emploi met fin à l'activité annexe, comme en Belgique réelle.
    const { count: stoppedActivities } = await this.prisma.client.independentActivity.deleteMany({
      where: { playerId },
    });
    if (stoppedActivities > 0) {
      await this.prisma.client.playerNotification.create({
        data: {
          playerId,
          type: "independent-activity-stopped",
          message: "Fin de ton emploi principal : ton activité d'indépendant complémentaire s'est arrêtée avec lui.",
          cycle: openCycle.number,
        },
      });
    }

    return { quit: true };
  }

  /**
   * Employeur d'autres joueurs (cf. domain/player-employment.ts) — une
   * offre publiée par l'actionnaire principal d'une entreprise, prenable
   * immédiatement par n'importe quel autre joueur (même logique ouverte que
   * LoanOffer, cf. companies.service.ts).
   */
  async createJobPosting(playerId: string, companyId: string, input: CreateJobPostingInput) {
    await this.assertPrimaryOwner(playerId, companyId);
    const company = await this.prisma.client.company.findUnique({ where: { id: companyId } });
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.companyJobPosting.create({
      data: {
        companyId,
        role: input.role,
        salary: input.salary,
        pressure: input.pressure,
        createdCycle: openCycle.number,
      },
    });
  }

  async cancelJobPosting(playerId: string, postingId: string) {
    const posting = await this.prisma.client.companyJobPosting.findUnique({ where: { id: postingId } });
    if (!posting) {
      throw new NotFoundException("Cette offre n'existe plus");
    }
    await this.assertPrimaryOwner(playerId, posting.companyId);
    if (posting.status !== "OPEN") {
      throw new BadRequestException("Cette offre n'est plus ouverte");
    }

    await this.prisma.client.companyJobPosting.update({ where: { id: postingId }, data: { status: "CLOSED" } });
    return { cancelled: true };
  }

  /** Vue de gestion RH côté employeur — offres ouvertes et employés en poste, pour piloter les embauches/licenciements. */
  async listCompanyStaff(playerId: string, companyId: string) {
    await this.assertPrimaryOwner(playerId, companyId);

    const [postings, employments] = await Promise.all([
      this.prisma.client.companyJobPosting.findMany({
        where: { companyId, status: "OPEN" },
        orderBy: { createdCycle: "desc" },
      }),
      this.prisma.client.employment.findMany({
        where: { companyId, employerType: "COMPANY", endedCycle: null },
        include: { player: { select: { pseudo: true } } },
        orderBy: { startedCycle: "asc" },
      }),
    ]);

    return {
      openPostings: postings.map((posting) => ({
        id: posting.id,
        role: posting.role,
        salaryPerCycle: posting.salary.toNumber(),
        pressure: posting.pressure,
      })),
      employees: employments.map((employment) => ({
        employmentId: employment.id,
        playerPseudo: employment.player.pseudo,
        role: employment.role,
        salaryPerCycle: employment.salary.toNumber(),
        pressure: employment.pressure,
        startedCycle: employment.startedCycle,
      })),
    };
  }

  async listJobPostings() {
    const postings = await this.prisma.client.companyJobPosting.findMany({
      where: { status: "OPEN" },
      include: { company: { include: { sector: true, municipality: true } } },
      orderBy: { createdCycle: "desc" },
    });

    return postings.map((posting) => ({
      id: posting.id,
      role: posting.role,
      salaryPerCycle: posting.salary.toNumber(),
      pressure: posting.pressure,
      company: {
        id: posting.company.id,
        name: posting.company.name,
        sector: posting.company.sector.name,
        municipality: posting.company.municipality.name,
      },
    }));
  }

  async applyToJobPosting(playerId: string, postingId: string) {
    const posting = await this.prisma.client.companyJobPosting.findUnique({
      where: { id: postingId },
      include: { company: { include: { sector: true, shares: true } } },
    });
    if (!posting || posting.status !== "OPEN") {
      throw new NotFoundException("Cette offre n'est plus disponible");
    }
    if (posting.company.status !== "ACTIVE") {
      throw new BadRequestException("Cette entreprise n'est plus active");
    }
    if (this.getPrimaryOwnerId(posting.company.shares) === playerId) {
      throw new BadRequestException("Tu ne peux pas travailler pour ta propre entreprise");
    }

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    const previousEmployment = await this.prisma.client.employment.findFirst({ where: { playerId, endedCycle: null } });
    const previousSector = await this.resolveEmploymentSector(previousEmployment);
    const targetSector = posting.company.sector.name;

    let reconversionPenalty = 0;
    if (previousSector && previousSector !== targetSector) {
      const priorExperience = await this.prisma.client.playerSectorExperience.findUnique({
        where: { playerId_sector: { playerId, sector: targetSector } },
      });
      reconversionPenalty = computeReconversionPenalty(priorExperience?.cycles ?? 0);
    }

    const employment = await this.prisma.client.$transaction(async (tx) => {
      const claimed = await tx.companyJobPosting.updateMany({
        where: { id: postingId, status: "OPEN" },
        data: { status: "FILLED" },
      });
      if (claimed.count === 0) {
        throw new BadRequestException("Cette offre vient d'être prise par quelqu'un d'autre");
      }

      await tx.employment.updateMany({
        where: { playerId, endedCycle: null },
        data: { endedCycle: openCycle.number },
      });

      const created = await tx.employment.create({
        data: {
          playerId,
          employerType: "COMPANY",
          companyId: posting.companyId,
          postingId: posting.id,
          role: posting.role,
          salary: posting.salary,
          pressure: posting.pressure,
          startedCycle: openCycle.number,
        },
      });

      if (reconversionPenalty > 0) {
        const stats = await tx.playerStats.findUnique({ where: { playerId } });
        if (stats) {
          await tx.playerStats.update({
            where: { playerId },
            data: { wellbeing: clampStat(stats.wellbeing.toNumber() - reconversionPenalty) },
          });
        }
      }

      const primaryOwnerId = this.getPrimaryOwnerId(posting.company.shares);
      if (primaryOwnerId) {
        await tx.playerNotification.create({
          data: {
            playerId: primaryOwnerId,
            type: "job-posting-filled",
            message: `Ton offre d'emploi "${posting.role}" (${posting.company.name}) a été prise par un joueur.`,
            cycle: openCycle.number,
          },
        });
      }

      return created;
    });

    await this.achievementsService.tryUnlock(playerId, "first-job");

    return { ...(await this.toEmploymentView(playerId, employment)), reconversionPenalty };
  }

  async fireCompanyEmployee(playerId: string, employmentId: string) {
    const employment = await this.prisma.client.employment.findUnique({ where: { id: employmentId } });
    if (!employment || employment.employerType !== "COMPANY" || !employment.companyId || employment.endedCycle !== null) {
      throw new NotFoundException("Cet emploi n'existe plus");
    }
    await this.assertPrimaryOwner(playerId, employment.companyId);

    const openCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.employment.update({
      where: { id: employmentId },
      data: { endedCycle: openCycle.number },
    });

    if (employment.postingId) {
      await this.prisma.client.companyJobPosting.updateMany({
        where: { id: employment.postingId, status: "FILLED" },
        data: { status: "OPEN" },
      });
    }

    await this.prisma.client.playerNotification.create({
      data: {
        playerId: employment.playerId,
        type: "job-lost",
        message: `Tu as été licencié de ton poste "${employment.role}".`,
        cycle: openCycle.number,
      },
    });

    return { fired: true };
  }

  private async toEmploymentView(playerId: string, employment: Employment) {
    const salaryPerCycle = employment.salary.toNumber();
    const job = employment.jobId ? NPC_JOBS[employment.jobId as JobId] : undefined;
    const employerCompany =
      employment.employerType === "COMPANY" && employment.companyId
        ? await this.prisma.client.company.findUnique({
            where: { id: employment.companyId },
            include: { sector: true },
          })
        : null;
    const sector = job?.sector ?? employerCompany?.sector.name;
    const pressure = job?.pressure ?? employment.pressure ?? undefined;

    const [sectorExperience, stats] = await Promise.all([
      sector
        ? this.prisma.client.playerSectorExperience.findUnique({
            where: { playerId_sector: { playerId, sector } },
          })
        : Promise.resolve(null),
      this.prisma.client.playerStats.findUnique({ where: { playerId } }),
    ]);
    const sectorCycles = sectorExperience?.cycles ?? 0;
    const nutritionLevel = computePersonalInvestmentLevel(stats?.nutritionInvestment.toNumber() ?? 0);
    const careerTier = getCareerTier(sectorCycles);

    return {
      role: employment.role,
      sector: sector ?? null,
      pressure: pressure ?? null,
      reputationPerCycle: job?.reputationPerCycle ?? null,
      employerCompanyId: employerCompany?.id ?? null,
      employerCompanyName: employerCompany?.name ?? null,
      salaryPerCycle,
      estimatedNetPerCycle: await this.cyclesService.estimateNetPerCycle(
        salaryPerCycle * CYCLES_PER_YEAR * careerTier.salaryMultiplier,
      ),
      estimatedWellbeingDrainPerCycle:
        pressure !== undefined ? computePressureDrain(pressure, sectorCycles, nutritionLevel) : 0,
      sectorExperienceCycles: sectorCycles,
      startedCycle: employment.startedCycle,
      careerTier: {
        id: careerTier.tier.id,
        label: careerTier.tier.label,
        salaryMultiplier: careerTier.salaryMultiplier,
        nextTierLabel: careerTier.nextTier?.label ?? null,
        cyclesToNextTier: careerTier.cyclesToNextTier,
      },
    };
  }

  private async resolveEmploymentSector(employment: Employment | null): Promise<string | undefined> {
    if (!employment) return undefined;
    if (employment.jobId) return NPC_JOBS[employment.jobId as JobId]?.sector;
    if (employment.employerType === "COMPANY" && employment.companyId) {
      const company = await this.prisma.client.company.findUnique({
        where: { id: employment.companyId },
        include: { sector: true },
      });
      return company?.sector.name;
    }
    return undefined;
  }

  private async notifyEmployerAndReopenPosting(employment: Employment, currentCycle: number, verb: string) {
    if (employment.postingId) {
      await this.prisma.client.companyJobPosting.updateMany({
        where: { id: employment.postingId, status: "FILLED" },
        data: { status: "OPEN" },
      });
    }
    if (!employment.companyId) return;
    const shares = await this.prisma.client.companyShare.findMany({ where: { companyId: employment.companyId } });
    const primaryOwnerId = this.getPrimaryOwnerId(shares);
    if (!primaryOwnerId) return;

    await this.prisma.client.playerNotification.create({
      data: {
        playerId: primaryOwnerId,
        type: "employee-departed",
        message: `Ton employé "${employment.role}" ${verb}.`,
        cycle: currentCycle,
      },
    });
  }

  private getPrimaryOwnerId(shares: ShareLike[]): string | undefined {
    if (shares.length === 0) return undefined;
    return shares.reduce((max, share) => (share.sharePercentage.toNumber() > max.sharePercentage.toNumber() ? share : max))
      .playerId;
  }

  private async assertPrimaryOwner(playerId: string, companyId: string) {
    const shares = await this.prisma.client.companyShare.findMany({ where: { companyId } });
    if (this.getPrimaryOwnerId(shares) !== playerId) {
      throw new ForbiddenException("Seul l'actionnaire principal peut piloter cette entreprise");
    }
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  COUNCIL_PROPOSAL_DURATION_CYCLES,
  MAX_REGISTRATION_DUTY_RATE_DELTA,
  MIN_COUNCIL_QUORUM_WEIGHT,
  MOVE_RESIDENCE_COOLDOWN_CYCLES,
  MOVE_RESIDENCE_COST,
  type CastCouncilVoteInput,
  type ContributeToInfrastructureInput,
  type CreateCouncilProposalInput,
  type MoveResidenceInput,
} from "@patrimoine-jeu/domain";
import { computeInfrastructureAttractivenessBonus, computeLocalInfrastructureDemandBonus } from "@patrimoine-jeu/game-engine";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const MOVE_RESIDENCE_ACTION_TYPE = "move-residence";

@Injectable()
export class MunicipalitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  /**
   * Usages sociaux de la richesse — investissement dans les infrastructures
   * communales (cf. domain/municipality-governance.ts) : bénéfice partagé
   * pour toutes les entreprises de la commune (cf. game-engine/cycles.ts),
   * statut visible pour le financeur (cf. listContributors ci-dessous).
   */
  async contribute(playerId: string, municipalityId: string, input: ContributeToInfrastructureInput) {
    const municipality = await this.prisma.client.municipality.findUnique({ where: { id: municipalityId } });
    if (!municipality) {
      throw new NotFoundException("Commune introuvable");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < input.amount) {
      throw new BadRequestException("Fonds insuffisants pour cette contribution");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: input.amount } } });
      await tx.municipality.update({
        where: { id: municipalityId },
        data: { infrastructureFund: { increment: input.amount } },
      });
      await tx.municipalityContribution.upsert({
        where: { municipalityId_playerId: { municipalityId, playerId } },
        create: { municipalityId, playerId, amount: input.amount, createdCycle: currentCycle.number },
        update: { amount: { increment: input.amount } },
      });
    });

    return this.getSummary(municipalityId);
  }

  async getSummary(municipalityId: string) {
    const municipality = await this.prisma.client.municipality.findUniqueOrThrow({ where: { id: municipalityId } });
    const fund = municipality.infrastructureFund.toNumber();
    return {
      id: municipality.id,
      infrastructureFund: fund,
      attractivenessBonus: computeInfrastructureAttractivenessBonus(fund),
      localDemandBonus: computeLocalInfrastructureDemandBonus(fund),
      registrationDutyRate: municipality.registrationDutyRate.toNumber(),
      additionalTaxRate: municipality.additionalTaxRate.toNumber(),
      annualPropertyTaxRate: municipality.annualPropertyTaxRate.toNumber(),
    };
  }

  /** Statut visible pour le financeur — classement public des contributeurs de cette commune. */
  async listContributors(municipalityId: string) {
    const contributions = await this.prisma.client.municipalityContribution.findMany({
      where: { municipalityId },
      orderBy: { amount: "desc" },
    });
    const players = await this.prisma.client.player.findMany({
      where: { id: { in: contributions.map((c) => c.playerId) } },
      select: { id: true, pseudo: true },
    });
    const pseudoById = new Map(players.map((p) => [p.id, p.pseudo]));

    return contributions.map((c) => ({
      playerPseudo: pseudoById.get(c.playerId) ?? "?",
      amount: c.amount.toNumber(),
    }));
  }

  /**
   * Conseil communal jouable — n'importe quel contributeur peut proposer,
   * le poids de vote est sa contribution cumulée à CETTE commune.
   */
  async createProposal(playerId: string, municipalityId: string, input: CreateCouncilProposalInput) {
    const contribution = await this.prisma.client.municipalityContribution.findUnique({
      where: { municipalityId_playerId: { municipalityId, playerId } },
    });
    if (!contribution) {
      throw new ForbiddenException("Seul un contributeur au fonds d'infrastructure peut proposer une décision");
    }
    const municipality = await this.prisma.client.municipality.findUniqueOrThrow({ where: { id: municipalityId } });
    const currentRate = municipality.registrationDutyRate.toNumber();
    if (Math.abs(input.newRegistrationDutyRate - currentRate) > MAX_REGISTRATION_DUTY_RATE_DELTA) {
      throw new BadRequestException(
        `La variation proposée dépasse le maximum autorisé (±${(MAX_REGISTRATION_DUTY_RATE_DELTA * 100).toFixed(0)} points)`,
      );
    }
    const existing = await this.prisma.client.municipalityProposal.findFirst({
      where: { municipalityId, status: "OPEN" },
    });
    if (existing) {
      throw new BadRequestException("Une proposition est déjà en cours de vote pour cette commune");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    return this.prisma.client.municipalityProposal.create({
      data: {
        municipalityId,
        proposerId: playerId,
        newRegistrationDutyRate: input.newRegistrationDutyRate,
        createdCycle: currentCycle.number,
        expiresCycle: currentCycle.number + COUNCIL_PROPOSAL_DURATION_CYCLES,
      },
    });
  }

  async listProposals(municipalityId: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();

    const expired = await this.prisma.client.municipalityProposal.findMany({
      where: { municipalityId, status: "OPEN", expiresCycle: { lt: currentCycle.number } },
    });
    for (const proposal of expired) {
      await this.resolveProposal(proposal.id, currentCycle.number);
    }

    const proposals = await this.prisma.client.municipalityProposal.findMany({
      where: { municipalityId },
      include: { votes: true },
      orderBy: { createdCycle: "desc" },
      take: 20,
    });
    const proposers = await this.prisma.client.player.findMany({
      where: { id: { in: [...new Set(proposals.map((p) => p.proposerId))] } },
      select: { id: true, pseudo: true },
    });
    const pseudoById = new Map(proposers.map((p) => [p.id, p.pseudo]));

    return proposals.map((proposal) => ({
      id: proposal.id,
      proposerPseudo: pseudoById.get(proposal.proposerId) ?? "?",
      newRegistrationDutyRate: proposal.newRegistrationDutyRate.toNumber(),
      status: proposal.status,
      forWeight: proposal.votes.filter((v) => v.inFavor).reduce((sum, v) => sum + v.weight.toNumber(), 0),
      againstWeight: proposal.votes.filter((v) => !v.inFavor).reduce((sum, v) => sum + v.weight.toNumber(), 0),
      createdCycle: proposal.createdCycle,
      expiresCycle: proposal.expiresCycle,
    }));
  }

  async castVote(playerId: string, proposalId: string, input: CastCouncilVoteInput) {
    const proposal = await this.prisma.client.municipalityProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.status !== "OPEN") {
      throw new NotFoundException("Cette proposition n'est plus ouverte au vote");
    }
    const contribution = await this.prisma.client.municipalityContribution.findUnique({
      where: { municipalityId_playerId: { municipalityId: proposal.municipalityId, playerId } },
    });
    if (!contribution) {
      throw new ForbiddenException("Seul un contributeur au fonds d'infrastructure peut voter");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    if (proposal.expiresCycle < currentCycle.number) {
      await this.resolveProposal(proposal.id, currentCycle.number);
      throw new BadRequestException("Le vote pour cette proposition est terminé");
    }

    await this.prisma.client.municipalityProposalVote.upsert({
      where: { proposalId_voterId: { proposalId, voterId: playerId } },
      create: {
        proposalId,
        voterId: playerId,
        inFavor: input.inFavor,
        weight: contribution.amount,
        createdCycle: currentCycle.number,
      },
      update: { inFavor: input.inFavor, weight: contribution.amount, createdCycle: currentCycle.number },
    });

    return { voted: true };
  }

  private async resolveProposal(proposalId: string, currentCycleNumber: number) {
    const claimed = await this.prisma.client.municipalityProposal.updateMany({
      where: { id: proposalId, status: "OPEN" },
      data: { status: "REJECTED" },
    });
    if (claimed.count === 0) return;

    const proposal = await this.prisma.client.municipalityProposal.findUniqueOrThrow({
      where: { id: proposalId },
      include: { votes: true, municipality: true },
    });
    const forWeight = proposal.votes.filter((v) => v.inFavor).reduce((sum, v) => sum + v.weight.toNumber(), 0);
    const againstWeight = proposal.votes.filter((v) => !v.inFavor).reduce((sum, v) => sum + v.weight.toNumber(), 0);
    const approved = forWeight > againstWeight && forWeight >= MIN_COUNCIL_QUORUM_WEIGHT;

    if (approved) {
      await this.prisma.client.municipalityProposal.update({ where: { id: proposalId }, data: { status: "APPROVED" } });
      await this.prisma.client.municipality.update({
        where: { id: proposal.municipalityId },
        data: { registrationDutyRate: proposal.newRegistrationDutyRate },
      });
      await this.prisma.client.pressArticle.create({
        data: {
          category: "COUNCIL_DECISION",
          headline: `Le conseil communal de ${proposal.municipality.name} a voté un nouveau taux de droits d'enregistrement : ${(proposal.newRegistrationDutyRate.toNumber() * 100).toFixed(1)}%.`,
          cycle: currentCycleNumber,
        },
      });
    } else {
      await this.prisma.client.pressArticle.create({
        data: {
          category: "COUNCIL_DECISION",
          headline: `Une proposition du conseil communal de ${proposal.municipality.name} a été rejetée faute de majorité.`,
          cycle: currentCycleNumber,
        },
      });
    }
  }

  /** Domicile fiscal (cf. domain/residence.ts) — undefined tant qu'aucune résidence n'a été choisie. */
  async getResidence(playerId: string) {
    const [player, currentCycle] = await Promise.all([
      this.prisma.client.player.findUnique({
        where: { id: playerId },
        select: { residenceMunicipalityId: true, residenceMunicipality: { select: { name: true } } },
      }),
      this.cyclesService.getOrCreateOpenCycle(),
    ]);
    const cooldown = await this.prisma.client.playerActionCooldown.findUnique({
      where: { playerId_actionType: { playerId, actionType: MOVE_RESIDENCE_ACTION_TYPE } },
    });
    const cyclesRemaining =
      cooldown === null ? 0 : Math.max(0, MOVE_RESIDENCE_COOLDOWN_CYCLES - (currentCycle.number - cooldown.lastCycle));

    return {
      municipalityId: player?.residenceMunicipalityId ?? null,
      municipalityName: player?.residenceMunicipality?.name ?? null,
      cyclesRemaining,
      available: cyclesRemaining === 0,
      cost: MOVE_RESIDENCE_COST,
    };
  }

  /**
   * Déménagement — coûte MOVE_RESIDENCE_COST et impose un cooldown (cf.
   * domain/residence.ts) : sans ça, un joueur pourrait arbitrer le taux
   * communal le plus bas à chaque cycle, ce qui viderait le choix de
   * résidence de tout son sens stratégique.
   */
  async moveResidence(playerId: string, input: MoveResidenceInput) {
    const municipality = await this.prisma.client.municipality.findUnique({ where: { id: input.municipalityId } });
    if (!municipality) {
      throw new NotFoundException("Commune introuvable");
    }

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < MOVE_RESIDENCE_COST) {
      throw new BadRequestException("Fonds insuffisants pour déménager");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.$transaction(async (tx) => {
      const cooldown = await tx.playerActionCooldown.findUnique({
        where: { playerId_actionType: { playerId, actionType: MOVE_RESIDENCE_ACTION_TYPE } },
      });
      if (cooldown && currentCycle.number - cooldown.lastCycle < MOVE_RESIDENCE_COOLDOWN_CYCLES) {
        throw new BadRequestException("Tu as déjà déménagé récemment — reviens plus tard");
      }

      await tx.playerActionCooldown.upsert({
        where: { playerId_actionType: { playerId, actionType: MOVE_RESIDENCE_ACTION_TYPE } },
        create: { playerId, actionType: MOVE_RESIDENCE_ACTION_TYPE, lastCycle: currentCycle.number },
        update: { lastCycle: currentCycle.number },
      });

      await tx.playerStats.update({
        where: { playerId },
        data: { wealthLiquid: { decrement: MOVE_RESIDENCE_COST } },
      });

      await tx.player.update({
        where: { id: playerId },
        data: { residenceMunicipalityId: input.municipalityId },
      });
    });

    return this.getResidence(playerId);
  }

  /**
   * Classement provincial — fonds d'infrastructure, entreprises actives et
   * résidents par province (cf. domicile fiscal ci-dessus), trié par fonds
   * d'infrastructure décroissant (le seul agrégat déjà central à la page
   * province, cf. province-detail.tsx).
   */
  async getRanking() {
    const [municipalities, companyCounts, residentCounts, residentWealth] = await Promise.all([
      this.prisma.client.municipality.findMany({
        include: { region: { select: { name: true } } },
      }),
      this.prisma.client.company.groupBy({
        by: ["municipalityId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
      this.prisma.client.player.groupBy({
        by: ["residenceMunicipalityId"],
        where: { residenceMunicipalityId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.client.player.findMany({
        where: { residenceMunicipalityId: { not: null } },
        select: { residenceMunicipalityId: true, stats: { select: { wealthDisplayed: true } } },
      }),
    ]);

    const companyCountById = new Map(companyCounts.map((row) => [row.municipalityId, row._count._all]));
    const residentCountById = new Map(residentCounts.map((row) => [row.residenceMunicipalityId, row._count._all]));
    const wealthById = new Map<string, number>();
    for (const player of residentWealth) {
      if (!player.residenceMunicipalityId) continue;
      wealthById.set(
        player.residenceMunicipalityId,
        (wealthById.get(player.residenceMunicipalityId) ?? 0) + (player.stats?.wealthDisplayed.toNumber() ?? 0),
      );
    }

    return municipalities
      .map((municipality) => ({
        id: municipality.id,
        name: municipality.name,
        regionName: municipality.region.name,
        infrastructureFund: municipality.infrastructureFund.toNumber(),
        activeCompanyCount: companyCountById.get(municipality.id) ?? 0,
        residentCount: residentCountById.get(municipality.id) ?? 0,
        residentWealth: wealthById.get(municipality.id) ?? 0,
      }))
      .sort((a, b) => b.infrastructureFund - a.infrastructureFund);
  }
}

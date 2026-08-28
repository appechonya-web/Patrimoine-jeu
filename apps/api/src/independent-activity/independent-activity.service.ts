import { BadRequestException, Injectable } from "@nestjs/common";
import { CYCLES_PER_YEAR, type StartIndependentActivityInput } from "@patrimoine-jeu/domain";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class IndependentActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  async get(playerId: string) {
    const activity = await this.prisma.client.independentActivity.findUnique({ where: { playerId } });
    return activity ? this.toView(activity) : null;
  }

  async estimate(playerId: string, grossRevenuePerCycle: number) {
    const [employment, player] = await Promise.all([
      this.getActiveEmployment(playerId),
      this.prisma.client.player.findUnique({
        where: { id: playerId },
        select: { residenceMunicipality: { select: { additionalTaxRate: true } } },
      }),
    ]);
    const mainAnnualGrossSalary = employment.salary.toNumber() * CYCLES_PER_YEAR;
    return this.cyclesService.estimateIndependentActivityNetPerCycle(
      mainAnnualGrossSalary,
      grossRevenuePerCycle,
      player?.residenceMunicipality?.additionalTaxRate.toNumber(),
    );
  }

  async start(playerId: string, input: StartIndependentActivityInput) {
    const [, existing] = await Promise.all([
      this.getActiveEmployment(playerId),
      this.prisma.client.independentActivity.findUnique({ where: { playerId } }),
    ]);
    if (existing) {
      throw new BadRequestException("Tu as déjà une activité complémentaire en cours — arrête-la avant d'en démarrer une autre");
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const activity = await this.prisma.client.independentActivity.create({
      data: { playerId, grossRevenuePerCycle: input.grossRevenuePerCycle, startedCycle: currentCycle.number },
    });
    return this.toView(activity);
  }

  async stop(playerId: string): Promise<{ stopped: boolean }> {
    const { count } = await this.prisma.client.independentActivity.deleteMany({ where: { playerId } });
    return { stopped: count > 0 };
  }

  private async getActiveEmployment(playerId: string) {
    const employment = await this.prisma.client.employment.findFirst({ where: { playerId, endedCycle: null } });
    if (!employment) {
      throw new BadRequestException(
        "Le statut d'indépendant complémentaire suppose un emploi principal actif — trouve d'abord un job",
      );
    }
    return employment;
  }

  private toView(activity: { id: string; grossRevenuePerCycle: { toNumber(): number }; startedCycle: number }) {
    return {
      id: activity.id,
      grossRevenuePerCycle: activity.grossRevenuePerCycle.toNumber(),
      startedCycle: activity.startedCycle,
    };
  }
}

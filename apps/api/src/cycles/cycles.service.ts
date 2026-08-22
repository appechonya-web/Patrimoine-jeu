import { Injectable } from "@nestjs/common";
import {
  closeCurrentCycle,
  estimateIndependentActivityNetPerCycle,
  estimateNetPerCycle,
  getOrCreateOpenCycle,
} from "@patrimoine-jeu/game-engine";
import { PrismaService } from "../prisma/prisma.service.js";

/**
 * Durée d'un cycle en ms — 30 minutes par défaut. Anciennement une constante
 * du worker BullMQ (supprimé pour rester déployable gratuitement, cf.
 * .github/workflows/close-cycle.yml) : la clôture est maintenant déclenchée
 * par un cron externe qui appelle POST /cycles/internal-close à intervalle
 * régulier, mais CETTE valeur reste la source de vérité sur la cadence
 * réelle du jeu — un appel plus fréquent que ça est un no-op (cf.
 * closeCycleIfDue), jamais une clôture en avance.
 */
const CYCLE_DURATION_MS = Number(process.env.CYCLE_DURATION_MS ?? 30 * 60 * 1000);

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateOpenCycle() {
    return getOrCreateOpenCycle(this.prisma.client);
  }

  /**
   * Clôture le cycle ouvert seulement si CYCLE_DURATION_MS s'est écoulé
   * depuis son ouverture — protège contre un cron externe qui appellerait
   * cette route trop souvent (webhook rejoué, cron mal configuré...) : sans
   * cette garde, chaque appel clôturerait un cycle, ce qui casserait
   * complètement la cadence sur laquelle tout l'équilibrage du jeu est
   * calé.
   */
  async closeCycleIfDue() {
    const openCycle = await getOrCreateOpenCycle(this.prisma.client);
    const elapsedMs = Date.now() - openCycle.startedAt.getTime();

    if (elapsedMs < CYCLE_DURATION_MS) {
      return {
        closed: false as const,
        currentCycle: openCycle.number,
        msUntilEligible: CYCLE_DURATION_MS - elapsedMs,
      };
    }

    const result = await closeCurrentCycle(this.prisma.client);
    return { closed: true as const, ...result };
  }

  estimateNetPerCycle(annualGrossSalary: number): Promise<number> {
    return estimateNetPerCycle(this.prisma.client, annualGrossSalary);
  }

  estimateIndependentActivityNetPerCycle(mainAnnualGrossSalary: number, sideGrossRevenuePerCycle: number) {
    return estimateIndependentActivityNetPerCycle(this.prisma.client, mainAnnualGrossSalary, sideGrossRevenuePerCycle);
  }
}

import { Injectable } from "@nestjs/common";
import {
  estimateIndependentActivityNetPerCycle,
  estimateNetPerCycle,
  getOrCreateOpenCycle,
} from "@patrimoine-jeu/game-engine";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  getOrCreateOpenCycle() {
    return getOrCreateOpenCycle(this.prisma.client);
  }

  estimateNetPerCycle(annualGrossSalary: number): Promise<number> {
    return estimateNetPerCycle(this.prisma.client, annualGrossSalary);
  }

  estimateIndependentActivityNetPerCycle(mainAnnualGrossSalary: number, sideGrossRevenuePerCycle: number) {
    return estimateIndependentActivityNetPerCycle(this.prisma.client, mainAnnualGrossSalary, sideGrossRevenuePerCycle);
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma, type PrismaClient } from "@patrimoine-jeu/db";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}

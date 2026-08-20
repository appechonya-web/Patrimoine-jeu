import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import {
  GUILD_FOUNDING_COST,
  GUILD_REFORM_COOLDOWN_CYCLES,
  type FoundGuildInput,
  type JoinGuildInput,
  type PostGuildMessageInput,
  type SetGuildPriceFloorInput,
} from "@patrimoine-jeu/domain";
import { CyclesService } from "../cycles/cycles.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

const GUILD_INCLUDE = {
  sector: true,
  members: { include: { company: { select: { name: true } } } },
};

@Injectable()
export class GuildsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cyclesService: CyclesService,
  ) {}

  async listBySector(sectorId?: string) {
    const guilds = await this.prisma.client.guild.findMany({
      where: { status: "ACTIVE", ...(sectorId ? { sectorId } : {}) },
      include: GUILD_INCLUDE,
      orderBy: { createdCycle: "asc" },
    });
    return guilds.map((guild) => this.toView(guild));
  }

  async found(playerId: string, input: FoundGuildInput) {
    const company = await this.assertCanJoin(playerId, input.companyId);
    await this.assertNoRecentDissolution(playerId, company.sectorId);

    const stats = await this.prisma.client.playerStats.findUnique({ where: { playerId } });
    if (!stats || stats.wealthLiquid.toNumber() < GUILD_FOUNDING_COST) {
      throw new BadRequestException(`Fonds insuffisants — il faut ${GUILD_FOUNDING_COST} € pour fonder un cartel`);
    }

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const guild = await this.prisma.client.$transaction(async (tx) => {
      await tx.playerStats.update({ where: { playerId }, data: { wealthLiquid: { decrement: GUILD_FOUNDING_COST } } });
      const created = await tx.guild.create({
        data: {
          name: input.name,
          sectorId: company.sectorId,
          founderPlayerId: playerId,
          priceFloor: input.priceFloor,
          createdCycle: currentCycle.number,
        },
      });
      await tx.guildMembership.create({
        data: { guildId: created.id, companyId: company.id, playerId, joinedCycle: currentCycle.number },
      });
      return created;
    });

    return this.getOne(guild.id);
  }

  async join(playerId: string, guildId: string, input: JoinGuildInput) {
    const guild = await this.prisma.client.guild.findUnique({ where: { id: guildId } });
    if (!guild || guild.status !== "ACTIVE") {
      throw new NotFoundException("Cartel introuvable");
    }

    const company = await this.assertCanJoin(playerId, input.companyId);
    if (company.sectorId !== guild.sectorId) {
      throw new BadRequestException("Cette entreprise n'est pas dans le même secteur que le cartel");
    }
    await this.assertNoRecentDissolution(playerId, guild.sectorId);

    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.guildMembership.create({
      data: { guildId, companyId: company.id, playerId, joinedCycle: currentCycle.number },
    });
    return this.getOne(guildId);
  }

  async leave(playerId: string, guildId: string, companyId: string) {
    const membership = await this.prisma.client.guildMembership.findUnique({
      where: { guildId_companyId: { guildId, companyId } },
    });
    if (!membership || membership.playerId !== playerId) {
      throw new NotFoundException("Adhésion introuvable");
    }
    await this.prisma.client.guildMembership.delete({ where: { id: membership.id } });
    return { left: true };
  }

  async setPriceFloor(playerId: string, guildId: string, input: SetGuildPriceFloorInput) {
    const guild = await this.prisma.client.guild.findUnique({ where: { id: guildId } });
    if (!guild || guild.status !== "ACTIVE") {
      throw new NotFoundException("Cartel introuvable");
    }
    if (guild.founderPlayerId !== playerId) {
      throw new ForbiddenException("Seul le fondateur du cartel peut ajuster le prix plancher");
    }
    await this.prisma.client.guild.update({ where: { id: guildId }, data: { priceFloor: input.priceFloor } });
    return this.getOne(guildId);
  }

  /**
   * Espace de communication ouvert de guilde (cf. domain/guild.ts) — un fil
   * de messages réservé aux membres ACTUELS (un joueur qui a quitté ne peut
   * plus ni lire ni écrire), distinct du mécanisme de cartel automatique
   * ci-dessus.
   */
  async postMessage(playerId: string, guildId: string, input: PostGuildMessageInput) {
    await this.assertIsMember(playerId, guildId);
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    await this.prisma.client.guildMessage.create({
      data: { guildId, playerId, body: input.body, createdCycle: currentCycle.number },
    });
    return this.listMessages(playerId, guildId);
  }

  async listMessages(playerId: string, guildId: string) {
    await this.assertIsMember(playerId, guildId);
    const messages = await this.prisma.client.guildMessage.findMany({
      where: { guildId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const authors = await this.prisma.client.player.findMany({
      where: { id: { in: [...new Set(messages.map((m) => m.playerId))] } },
      select: { id: true, pseudo: true },
    });
    const pseudoById = new Map(authors.map((p) => [p.id, p.pseudo]));

    return messages.map((message) => ({
      id: message.id,
      authorPseudo: pseudoById.get(message.playerId) ?? "?",
      body: message.body,
      cycle: message.createdCycle,
      createdAt: message.createdAt,
    }));
  }

  private async assertIsMember(playerId: string, guildId: string) {
    const guild = await this.prisma.client.guild.findUnique({ where: { id: guildId } });
    if (!guild || guild.status !== "ACTIVE") {
      throw new NotFoundException("Cartel introuvable");
    }
    const membership = await this.prisma.client.guildMembership.findFirst({ where: { guildId, playerId } });
    if (!membership) {
      throw new ForbiddenException("Réservé aux membres actuels du cartel");
    }
  }

  private async getOne(guildId: string) {
    const guild = await this.prisma.client.guild.findUniqueOrThrow({ where: { id: guildId }, include: GUILD_INCLUDE });
    return this.toView(guild);
  }

  private async assertCanJoin(playerId: string, companyId: string) {
    const [company, shares, existingMembership] = await Promise.all([
      this.prisma.client.company.findUnique({ where: { id: companyId } }),
      this.prisma.client.companyShare.findMany({ where: { companyId } }),
      this.prisma.client.guildMembership.findFirst({ where: { companyId, guild: { status: "ACTIVE" } } }),
    ]);
    if (!company || company.status !== "ACTIVE") {
      throw new NotFoundException("Entreprise introuvable");
    }
    const primaryShare = shares.reduce(
      (max, share) => (share.sharePercentage.gt(max?.sharePercentage ?? 0) ? share : max),
      shares[0],
    );
    if (!primaryShare || primaryShare.playerId !== playerId) {
      throw new ForbiddenException("Seul l'actionnaire principal de l'entreprise peut la faire adhérer à un cartel");
    }
    if (existingMembership) {
      throw new BadRequestException("Cette entreprise fait déjà partie d'un cartel");
    }
    return company;
  }

  private async assertNoRecentDissolution(playerId: string, sectorId: string) {
    const currentCycle = await this.cyclesService.getOrCreateOpenCycle();
    const recentlyDissolved = await this.prisma.client.guild.findFirst({
      where: {
        sectorId,
        status: "DISSOLVED",
        dissolvedCycle: { gte: currentCycle.number - GUILD_REFORM_COOLDOWN_CYCLES },
        members: { some: { playerId } },
      },
    });
    if (recentlyDissolved) {
      throw new BadRequestException(
        "Un cartel dont tu faisais partie dans ce secteur a été démantelé récemment — attends avant d'en refonder ou d'en rejoindre un autre",
      );
    }
  }

  private toView(guild: {
    id: string;
    name: string;
    sectorId: string;
    sector: { name: string };
    priceFloor: { toNumber(): number };
    founderPlayerId: string;
    createdCycle: number;
    members: { companyId: string; playerId: string; company: { name: string } }[];
  }) {
    return {
      id: guild.id,
      name: guild.name,
      sectorId: guild.sectorId,
      sectorName: guild.sector.name,
      priceFloor: guild.priceFloor.toNumber(),
      founderPlayerId: guild.founderPlayerId,
      createdCycle: guild.createdCycle,
      members: guild.members.map((member) => ({
        companyId: member.companyId,
        companyName: member.company.name,
        playerId: member.playerId,
      })),
    };
  }
}

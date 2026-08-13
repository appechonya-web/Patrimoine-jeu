import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(playerId: string) {
    const player = await this.prisma.client.player.findUnique({
      where: { id: playerId },
      include: { stats: true },
    });

    if (!player) {
      throw new NotFoundException(`Player ${playerId} not found`);
    }

    return {
      id: player.id,
      email: player.email,
      pseudo: player.pseudo,
      createdAt: player.createdAt,
      stats: player.stats
        ? {
            wealthLiquid: player.stats.wealthLiquid.toNumber(),
            wealthDisplayed: player.stats.wealthDisplayed.toNumber(),
            reputation: player.stats.reputation.toNumber(),
            experience: player.stats.experience.toNumber(),
            wellbeing: player.stats.wellbeing.toNumber(),
          }
        : null,
    };
  }
}

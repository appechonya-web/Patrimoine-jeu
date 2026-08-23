import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { STARTING_PROFILE_CATALOG, type LoginInput, type RegisterInput } from "@patrimoine-jeu/domain";
import { PrismaService } from "../prisma/prisma.service.js";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<{ playerId: string; token: string }> {
    const existing = await this.prisma.client.player.findFirst({
      where: { OR: [{ email: input.email }, { pseudo: input.pseudo }] },
    });

    if (existing) {
      throw new ConflictException("Email ou pseudo déjà utilisé");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const profile = STARTING_PROFILE_CATALOG[input.startingProfileId];

    const player = await this.prisma.client.player.create({
      data: {
        email: input.email,
        pseudo: input.pseudo,
        passwordHash,
        stats: {
          create: {
            wellbeing: profile.startingWellbeing,
            reputation: profile.startingReputation,
          },
        },
      },
    });

    return { playerId: player.id, token: this.signToken(player.id) };
  }

  async login(input: LoginInput): Promise<{ playerId: string; token: string }> {
    const player = await this.prisma.client.player.findUnique({
      where: { email: input.email },
    });

    if (!player || !(await bcrypt.compare(input.password, player.passwordHash))) {
      throw new UnauthorizedException("Identifiants invalides");
    }

    return { playerId: player.id, token: this.signToken(player.id) };
  }

  private signToken(playerId: string): string {
    return this.jwtService.sign({ sub: playerId });
  }
}

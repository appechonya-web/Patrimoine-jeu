import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";

interface AuthTokenPayload {
  sub: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { playerId: string }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Non authentifié");
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(token);
      request.playerId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Session invalide ou expirée");
    }
  }

  private extractToken(request: Request): string | undefined {
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.token;
    if (cookieToken) return cookieToken;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice("Bearer ".length);
    }

    return undefined;
  }
}

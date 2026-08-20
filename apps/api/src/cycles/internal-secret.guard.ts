import { Injectable, type CanActivate, type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";

const HEADER_NAME = "x-internal-secret";

/**
 * Garde pour les routes internes déclenchées par un service externe (cron
 * GitHub Actions déclenchant la clôture de cycle, cf. .github/workflows) —
 * jamais un joueur, donc pas de JWT ici : un secret partagé, comparé en
 * temps constant pour ne pas laisser fuir sa valeur via le temps de
 * réponse.
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_CYCLE_SECRET;
    if (!expected) {
      throw new UnauthorizedException("INTERNAL_CYCLE_SECRET non configuré côté serveur");
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[HEADER_NAME];

    if (typeof provided !== "string" || !safeEqual(provided, expected)) {
      throw new UnauthorizedException("Secret invalide");
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

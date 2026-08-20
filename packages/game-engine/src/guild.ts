import {
  GUILD_BASE_DETECTION_RATE,
  GUILD_DETECTION_SENSITIVITY,
  GUILD_MAX_DETECTION_PROBABILITY,
  GUILD_PER_MEMBER_DETECTION_INCREMENT,
} from "@patrimoine-jeu/domain";

/**
 * Probabilité de détection d'un cartel à un cycle donné — croît avec
 * l'écart entre le prix plancher imposé et le prix de référence du marché
 * (plus l'entente est flagrante, plus elle se voit) et avec le nombre de
 * membres (plus il y a de monde dans le secret, plus une fuite est
 * probable) — cf. domain/guild.ts pour le calibrage.
 */
export function computeGuildDetectionProbability(priceFloor: number, referencePrice: number, memberCount: number): number {
  const excessRatio = Math.max(0, priceFloor / referencePrice - 1);
  const probability =
    GUILD_BASE_DETECTION_RATE +
    excessRatio * GUILD_DETECTION_SENSITIVITY +
    Math.max(0, memberCount - 1) * GUILD_PER_MEMBER_DETECTION_INCREMENT;
  return Math.min(GUILD_MAX_DETECTION_PROBABILITY, probability);
}

export function rollGuildDetection(priceFloor: number, referencePrice: number, memberCount: number): boolean {
  return Math.random() < computeGuildDetectionProbability(priceFloor, referencePrice, memberCount);
}

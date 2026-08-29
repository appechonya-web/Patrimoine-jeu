import { PUBLIC_CONTRACT_MIN_ATTRACTIVENESS, PUBLIC_CONTRACT_SCALE } from "@patrimoine-jeu/domain";

/** Revenu passif des contrats publics — nul sous le seuil d'attractivité, rendements décroissants au-delà (cf. domain/public-contracts.ts). */
export function computePublicContractRevenue(attractivenessScore: number): number {
  const excess = Math.max(0, attractivenessScore - PUBLIC_CONTRACT_MIN_ATTRACTIVENESS);
  return PUBLIC_CONTRACT_SCALE * Math.sqrt(excess);
}

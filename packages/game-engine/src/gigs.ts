import type { GigDefinition } from "@patrimoine-jeu/domain";

/** Récompense d'un petit boulot — tirée aléatoirement dans sa fourchette (cf. domain/gigs.ts). */
export function computeGigReward(gig: GigDefinition): number {
  return gig.minReward + Math.random() * (gig.maxReward - gig.minReward);
}

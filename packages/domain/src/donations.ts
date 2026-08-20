import { z } from "zod";

/**
 * Dons & mécénat (section 11 du document de conception) — deux régimes
 * fiscaux volontairement différents pour illustrer un vrai choix : un don
 * entre joueurs est un don entre tiers (pas de lien de parenté modélisé
 * dans le jeu), taxé aux droits de donation ; un don à une cause reconnue
 * bénéficie d'une réduction d'impôt immédiate (même mécanique que
 * l'épargne-pension, cf. game-engine/donations.ts) et d'aucun droit de
 * donation — la leçon fiscale : donner à une cause reconnue coûte
 * nettement moins cher, légalement, que donner à un particulier.
 */

export const MIN_DONATION_AMOUNT = 5;

/** Droits de donation entre tiers (joueurs) — pas de lien de parenté modélisé, taux "autres" plus lourd que le taux en ligne directe. */
export const PLAYER_DONATION_GIFT_TAX_RATE = 0.3;

/** Réduction d'impôt pour libéralités à une cause reconnue — même ordre de grandeur que le régime belge réel. */
export const CAUSE_DONATION_TAX_REDUCTION_RATE = 0.45;
export const CAUSE_DONATION_ANNUAL_CAP = 2_000;

export const CAUSE_IDS = [
  "solidarite-wallonne",
  "croix-verte-bruxelloise",
  "education-pour-tous",
  "refuge-animalier",
] as const;
export type CauseId = (typeof CAUSE_IDS)[number];

export interface CauseDefinition {
  id: CauseId;
  name: string;
  description: string;
}

export const CAUSE_CATALOG: Record<CauseId, CauseDefinition> = {
  "solidarite-wallonne": {
    id: "solidarite-wallonne",
    name: "Fondation Solidarité Wallonne",
    description: "Aide alimentaire et logement d'urgence en Wallonie.",
  },
  "croix-verte-bruxelloise": {
    id: "croix-verte-bruxelloise",
    name: "Croix Verte Bruxelloise",
    description: "Premiers secours et sensibilisation à la santé publique.",
  },
  "education-pour-tous": {
    id: "education-pour-tous",
    name: "Fonds Éducation pour Tous",
    description: "Bourses et matériel scolaire pour familles à faibles revenus.",
  },
  "refuge-animalier": {
    id: "refuge-animalier",
    name: "Refuge Animalier National",
    description: "Recueil et soins d'animaux abandonnés.",
  },
};
export const CAUSE_LIST: CauseDefinition[] = Object.values(CAUSE_CATALOG);

export const donateToPlayerInputSchema = z.object({
  recipientPseudo: z.string().min(1),
  amount: z.number().min(MIN_DONATION_AMOUNT),
});
export type DonateToPlayerInput = z.infer<typeof donateToPlayerInputSchema>;

export const donateToCauseInputSchema = z.object({
  causeId: z.enum(CAUSE_IDS),
  amount: z.number().min(MIN_DONATION_AMOUNT),
});
export type DonateToCauseInput = z.infer<typeof donateToCauseInputSchema>;

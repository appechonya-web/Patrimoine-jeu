/**
 * Petits boulots — revenu d'appoint immédiat, sans capital ni engagement,
 * cumulable avec un emploi. Pensé pour le tout début de partie : là où
 * fonder une entreprise ou investir dans l'immobilier demande déjà un peu
 * de trésorerie, un petit boulot rapporte une somme modeste sur-le-champ.
 * Chaque petit boulot a son propre cooldown, compté en TEMPS RÉEL (cf.
 * PlayerActionCooldown.lastPlayedAt, actionType "gig:<id>") — pas en cycles
 * de jeu (CYCLE_DURATION_MS, ~1h en production) : un cooldown en cycles
 * aurait couplé la fréquence d'un petit boulot au rythme de clôture, à
 * l'opposé de l'usage recherché (garder un nouveau joueur actif dès sa
 * première session, indépendamment de la cadence des cycles).
 */

export const GIG_IDS = ["sondage", "livraison", "garde-animaux", "demenagement", "cours-particuliers"] as const;
export type GigId = (typeof GIG_IDS)[number];

export interface GigDefinition {
  id: GigId;
  label: string;
  description: string;
  minReward: number;
  maxReward: number;
  wellbeingCost: number;
  cooldownSeconds: number;
  /** Réputation minimale requise (0 pour les boulots ouverts à tous). */
  minReputation: number;
}

export const GIG_CATALOG: Record<GigId, GigDefinition> = {
  sondage: {
    id: "sondage",
    label: "Sondage rémunéré",
    description: "Quelques questionnaires en ligne — rapide, ne fatigue pas.",
    minReward: 4,
    maxReward: 9,
    wellbeingCost: 0,
    cooldownSeconds: 300,
    minReputation: 0,
  },
  livraison: {
    id: "livraison",
    label: "Livraison de repas",
    description: "Quelques courses à vélo dans le quartier.",
    minReward: 12,
    maxReward: 22,
    wellbeingCost: 1,
    cooldownSeconds: 600,
    minReputation: 0,
  },
  "garde-animaux": {
    id: "garde-animaux",
    label: "Garde d'animaux",
    description: "Promener ou nourrir les animaux des voisins.",
    minReward: 10,
    maxReward: 18,
    wellbeingCost: 0,
    cooldownSeconds: 480,
    minReputation: 0,
  },
  demenagement: {
    id: "demenagement",
    label: "Aide au déménagement",
    description: "Un coup de main musclé, bien payé mais fatigant.",
    minReward: 35,
    maxReward: 55,
    wellbeingCost: 3,
    cooldownSeconds: 1200,
    minReputation: 0,
  },
  "cours-particuliers": {
    id: "cours-particuliers",
    label: "Cours particuliers",
    description: "Donner des cours de soutien — demande un peu de crédibilité.",
    minReward: 28,
    maxReward: 42,
    wellbeingCost: 1,
    cooldownSeconds: 900,
    minReputation: 40,
  },
};

export const GIG_LIST: GigDefinition[] = Object.values(GIG_CATALOG);

/**
 * Profil de départ (section unicité des parcours) — un vrai choix à
 * l'inscription, pas un tirage au hasard : chaque profil redistribue les
 * mêmes deux stats de départ (bien-être, réputation, qui partent sinon
 * toutes deux à 50 pour tout le monde) selon un compromis différent, sans
 * qu'aucun ne soit strictement meilleur qu'un autre. Le patrimoine liquide
 * n'est volontairement jamais touché : tout le monde part de zéro,
 * uniquement la manière d'aborder ce départ change.
 *
 * La réputation de départ reste dans une fourchette modeste (40-60) —
 * cf. domain/gigs.ts JobGig.minReputation, qui déverrouille certains petits
 * boulots : un écart trop large donnerait un vrai avantage de contenu
 * débloqué, pas juste une nuance de personnalité.
 */

export const STARTING_PROFILE_IDS = ["jeune-diplome", "veteran", "equilibre"] as const;
export type StartingProfileId = (typeof STARTING_PROFILE_IDS)[number];

export interface StartingProfileDefinition {
  id: StartingProfileId;
  label: string;
  description: string;
  startingWellbeing: number;
  startingReputation: number;
}

export const STARTING_PROFILE_CATALOG: Record<StartingProfileId, StartingProfileDefinition> = {
  "jeune-diplome": {
    id: "jeune-diplome",
    label: "Jeune diplômé",
    description: "Tout juste sorti des études, plein d'énergie — mais encore à faire ses preuves.",
    startingWellbeing: 60,
    startingReputation: 40,
  },
  veteran: {
    id: "veteran",
    label: "Vétéran reconverti",
    description: "Une carrière déjà respectée derrière toi — mais l'usure du changement se fait sentir.",
    startingWellbeing: 40,
    startingReputation: 60,
  },
  equilibre: {
    id: "equilibre",
    label: "Parcours classique",
    description: "Ni tout neuf ni usé — un départ sans extrême dans un sens ou dans l'autre.",
    startingWellbeing: 50,
    startingReputation: 50,
  },
};

export const STARTING_PROFILE_LIST: StartingProfileDefinition[] = Object.values(STARTING_PROFILE_CATALOG);

export const DEFAULT_STARTING_PROFILE_ID: StartingProfileId = "equilibre";

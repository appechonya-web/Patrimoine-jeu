import { z } from "zod";

/**
 * Section bien-être personnelle — pendant individuel des leviers
 * d'entreprise (cf. company.ts, INVESTMENT_AXES) : des axes d'investissement
 * permanents qui modulent durablement les formules de bien-être
 * (packages/game-engine/src/wellbeing.ts), complétés par des actions
 * ponctuelles (vacances, sorties...) pour un boost immédiat mais temporaire
 * dans son effet (le bien-être retombe ensuite dans le rythme normal).
 */

export const PERSONAL_AXES = ["sport", "nutrition", "social", "comfort"] as const;
export type PersonalAxis = (typeof PERSONAL_AXES)[number];

export const PERSONAL_AXIS_LABELS: Record<PersonalAxis, string> = {
  sport: "Sport & santé",
  nutrition: "Alimentation & sommeil",
  social: "Vie sociale & loisirs",
  comfort: "Confort de vie",
};

export const PERSONAL_AXIS_DESCRIPTIONS: Record<PersonalAxis, string> = {
  sport: "Augmente la régénération passive de bien-être à chaque cycle.",
  nutrition: "Réduit l'usure due à la pression au travail, quel que soit le poste.",
  social: "Abaisse le seuil à partir duquel le bien-être booste les revenus.",
  comfort: "Atténue le malus de revenu en cas de coup de mou (bien-être bas).",
};

export const MIN_PERSONAL_INVESTMENT_AMOUNT = 20;
export const MAX_PERSONAL_INVESTMENT_PER_CYCLE = 200;

/**
 * Même cooldown hebdomadaire que les leviers d'entreprise
 * (cf. company.ts ACTION_COOLDOWN_CYCLES) — impossible d'accélérer en
 * mettant plus d'argent d'un coup.
 */
export const PERSONAL_ACTION_COOLDOWN_CYCLES = 7;

/**
 * Échelle plus abordable qu'un levier d'entreprise (cf.
 * company.ts INVESTMENT_LEVEL_SCALE) : le niveau 100 coûte 20 000 € cumulés
 * au lieu de 50 000 €, cohérent avec des revenus individuels plutôt
 * qu'un chiffre d'affaires d'entreprise — mais toujours un engagement dans
 * la durée (~29 jours au rythme maximal autorisé, à raison d'1 cycle/heure).
 */
export const PERSONAL_INVESTMENT_LEVEL_SCALE = 2;

/**
 * Palier mondial personnel (cf. company.ts/valorization.ts GLOBAL_TIER_SCALE
 * côté entreprise) : au-delà du niveau 100 (plafond dur de chaque axe,
 * atteint à PERSONAL_INVESTMENT_LEVEL_SCALE × 100² investis), l'investissement
 * cumulé continue de rapporter un bonus en rendements décroissants — pour
 * qu'un joueur assis sur des millions puisse continuer à faire progresser
 * ses axes personnels au lieu de plafonner sans recours dès le niveau 100.
 * Échelle réduite proportionnellement à PERSONAL_INVESTMENT_LEVEL_SCALE
 * (2 contre 5 côté entreprise) pour rester cohérente avec des montants
 * individuels plutôt qu'un chiffre d'affaires d'entreprise.
 */
export const PERSONAL_GLOBAL_TIER_SCALE = 20;
export const MAX_PERSONAL_GLOBAL_TIER_BONUS = 100;

/** Sport : régénération de bien-être passive doublée au niveau 100. */
export const MAX_SPORT_REGEN_BONUS = 1;
/** Nutrition & sommeil : jusqu'à 30% de drain de pression en moins, cumulable avec la tolérance sectorielle. */
export const MAX_NUTRITION_DRAIN_REDUCTION = 0.3;
/** Vie sociale : le seuil du bonus "épanoui" descend de 70 à 50 au niveau 100. */
export const MAX_SOCIAL_BOOM_THRESHOLD_REDUCTION = 20;
/** Confort de vie : le malus de burnout est divisé par deux au niveau 100. */
export const MAX_COMFORT_BURNOUT_REDUCTION = 0.5;

export const investPersonalInputSchema = z.object({
  axis: z.enum(PERSONAL_AXES),
  amount: z.number().min(MIN_PERSONAL_INVESTMENT_AMOUNT).max(MAX_PERSONAL_INVESTMENT_PER_CYCLE),
});
export type InvestPersonalInput = z.infer<typeof investPersonalInputSchema>;

// --- Actions ponctuelles ---------------------------------------------------

export const PERSONAL_ACTION_IDS = ["sortie", "therapie", "weekend", "vacances"] as const;
export type PersonalActionId = (typeof PERSONAL_ACTION_IDS)[number];

export interface PersonalActionDefinition {
  id: PersonalActionId;
  label: string;
  description: string;
  cost: number;
  wellbeingBoost: number;
  cooldownCycles: number;
}

export const PERSONAL_ACTION_CATALOG: Record<PersonalActionId, PersonalActionDefinition> = {
  sortie: {
    id: "sortie",
    label: "Sortie entre amis",
    description: "Une soirée pour décompresser — effet modeste mais rapide à renouveler.",
    cost: 20,
    wellbeingBoost: 3,
    cooldownCycles: 3,
  },
  therapie: {
    id: "therapie",
    label: "Séance chez un thérapeute",
    description: "Prendre du recul sur ce qui pèse — utile après un coup dur.",
    cost: 60,
    wellbeingBoost: 6,
    cooldownCycles: 7,
  },
  weekend: {
    id: "weekend",
    label: "Weekend détente",
    description: "Deux jours coupé de tout.",
    cost: 80,
    wellbeingBoost: 8,
    cooldownCycles: 10,
  },
  vacances: {
    id: "vacances",
    label: "Vacances",
    description: "Une vraie coupure — le meilleur boost, mais rare et cher.",
    cost: 400,
    wellbeingBoost: 20,
    cooldownCycles: 30,
  },
};

export const PERSONAL_ACTION_LIST: PersonalActionDefinition[] = Object.values(PERSONAL_ACTION_CATALOG);

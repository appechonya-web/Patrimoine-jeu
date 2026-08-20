import { z } from "zod";

/**
 * Biens de consommation personnels — complète la section bien-être par du
 * tangible : contrairement aux axes (packages/domain/personal.ts), ce sont
 * de vrais actifs possédés (comptent dans le patrimoine total, cf.
 * cycles.ts) qui se déprécient avec le temps, plutôt que des paliers
 * d'investissement abstraits. Chaque bien possédé donne un petit bonus de
 * régénération de bien-être passif tant qu'il est détenu (cumulable entre
 * plusieurs biens) — pas de coût d'entretien ni de casse aléatoire,
 * volontairement simple : acheter, profiter, revendre à la valeur
 * résiduelle courante quand on veut.
 */

export const PERSONAL_GOOD_CATEGORIES = ["vehicule", "mobilier", "electronique"] as const;
export type PersonalGoodCategory = (typeof PERSONAL_GOOD_CATEGORIES)[number];

export const PERSONAL_GOOD_CATEGORY_LABELS: Record<PersonalGoodCategory, string> = {
  vehicule: "🚗 Véhicules",
  mobilier: "🛋️ Mobilier",
  electronique: "💻 Électronique",
};

export const PERSONAL_GOOD_IDS = [
  "velo",
  "voiture-occasion",
  "voiture-familiale",
  "voiture-luxe",
  "meubles-basiques",
  "mobilier-design",
  "home-cinema",
  "smartphone",
  "ordinateur-gaming",
  "home-studio",
] as const;
export type PersonalGoodId = (typeof PERSONAL_GOOD_IDS)[number];

export interface PersonalGoodDefinition {
  id: PersonalGoodId;
  category: PersonalGoodCategory;
  label: string;
  description: string;
  price: number;
  /** Bonus de régénération de bien-être par cycle, tant que le bien est détenu — cumulable avec BASELINE_WELLBEING_REGEN et les axes personnels. */
  wellbeingBonusPerCycle: number;
  /** Dépréciation exponentielle par cycle (cf. computePersonalGoodValue) — plus rapide pour l'électronique, plus lente pour le mobilier solide. */
  depreciationRatePerCycle: number;
}

export const PERSONAL_GOOD_CATALOG: Record<PersonalGoodId, PersonalGoodDefinition> = {
  velo: {
    id: "velo",
    category: "vehicule",
    label: "Vélo",
    description: "De quoi se déplacer et s'aérer l'esprit.",
    price: 300,
    wellbeingBonusPerCycle: 0.005,
    depreciationRatePerCycle: 0.001,
  },
  "voiture-occasion": {
    id: "voiture-occasion",
    category: "vehicule",
    label: "Voiture d'occasion",
    description: "Rien de luxueux, mais ça roule.",
    price: 8_000,
    wellbeingBonusPerCycle: 0.012,
    depreciationRatePerCycle: 0.0006,
  },
  "voiture-familiale": {
    id: "voiture-familiale",
    category: "vehicule",
    label: "Voiture familiale",
    description: "Confortable et fiable au quotidien.",
    price: 25_000,
    wellbeingBonusPerCycle: 0.018,
    depreciationRatePerCycle: 0.0005,
  },
  "voiture-luxe": {
    id: "voiture-luxe",
    category: "vehicule",
    label: "Voiture de luxe",
    description: "Le grand confort — et le regard des autres.",
    price: 80_000,
    wellbeingBonusPerCycle: 0.025,
    depreciationRatePerCycle: 0.0004,
  },
  "meubles-basiques": {
    id: "meubles-basiques",
    category: "mobilier",
    label: "Meubles basiques",
    description: "De quoi meubler sans se ruiner.",
    price: 500,
    wellbeingBonusPerCycle: 0.004,
    depreciationRatePerCycle: 0.0004,
  },
  "mobilier-design": {
    id: "mobilier-design",
    category: "mobilier",
    label: "Mobilier design",
    description: "Un intérieur soigné, agréable à vivre.",
    price: 3_000,
    wellbeingBonusPerCycle: 0.01,
    depreciationRatePerCycle: 0.0003,
  },
  "home-cinema": {
    id: "home-cinema",
    category: "mobilier",
    label: "Home cinéma",
    description: "Le confort du grand écran chez soi.",
    price: 5_000,
    wellbeingBonusPerCycle: 0.014,
    depreciationRatePerCycle: 0.0007,
  },
  smartphone: {
    id: "smartphone",
    category: "electronique",
    label: "Smartphone haut de gamme",
    description: "Pratique, mais vite dépassé.",
    price: 800,
    wellbeingBonusPerCycle: 0.006,
    depreciationRatePerCycle: 0.0015,
  },
  "ordinateur-gaming": {
    id: "ordinateur-gaming",
    category: "electronique",
    label: "Ordinateur gaming",
    description: "Pour décompresser après une longue journée.",
    price: 2_000,
    wellbeingBonusPerCycle: 0.009,
    depreciationRatePerCycle: 0.001,
  },
  "home-studio": {
    id: "home-studio",
    category: "electronique",
    label: "Home studio",
    description: "Un vrai espace créatif à soi.",
    price: 6_000,
    wellbeingBonusPerCycle: 0.016,
    depreciationRatePerCycle: 0.0008,
  },
};

export const PERSONAL_GOOD_LIST: PersonalGoodDefinition[] = Object.values(PERSONAL_GOOD_CATALOG);

/** Valeur résiduelle plancher — un bien usagé garde toujours un peu de valeur, jamais nulle. */
export const MIN_PERSONAL_GOOD_RESIDUAL_RATIO = 0.1;

export const buyPersonalGoodInputSchema = z.object({
  goodId: z.enum(PERSONAL_GOOD_IDS),
});
export type BuyPersonalGoodInput = z.infer<typeof buyPersonalGoodInputSchema>;

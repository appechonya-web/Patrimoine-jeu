/**
 * Progression de carrière — un bonus de salaire croissant avec l'ancienneté
 * dans un même secteur (PlayerSectorExperience.cycles, déjà utilisé pour la
 * tolérance à la pression et la pénalité de reconversion, cf.
 * game-engine/wellbeing.ts). Encourage la spécialisation dans la durée
 * plutôt que le saut de secteur en secteur : rester quelque part change la
 * paie, pas seulement le bien-être.
 */

export interface CareerTierDefinition {
  id: string;
  label: string;
  minCycles: number;
  salaryMultiplier: number;
}

export const CAREER_TIERS: CareerTierDefinition[] = [
  { id: "debutant", label: "Débutant", minCycles: 0, salaryMultiplier: 1 },
  { id: "confirme", label: "Confirmé", minCycles: 60, salaryMultiplier: 1.06 },
  { id: "experimente", label: "Expérimenté", minCycles: 180, salaryMultiplier: 1.14 },
  { id: "senior", label: "Senior", minCycles: 350, salaryMultiplier: 1.22 },
  { id: "expert", label: "Expert", minCycles: 700, salaryMultiplier: 1.32 },
  { id: "veteran", label: "Vétéran", minCycles: 1500, salaryMultiplier: 1.45 },
  { id: "reference", label: "Référence du secteur", minCycles: 3000, salaryMultiplier: 1.6 },
  { id: "legende", label: "Légende vivante", minCycles: 6000, salaryMultiplier: 1.75 },
];

export interface CareerTierResult {
  tier: CareerTierDefinition;
  salaryMultiplier: number;
  nextTier: CareerTierDefinition | null;
  cyclesToNextTier: number | null;
}

export function getCareerTier(sectorCycles: number): CareerTierResult {
  let current = CAREER_TIERS[0];
  for (const tier of CAREER_TIERS) {
    if (sectorCycles >= tier.minCycles) {
      current = tier;
    } else {
      break;
    }
  }

  const nextTier = CAREER_TIERS[CAREER_TIERS.indexOf(current) + 1] ?? null;

  return {
    tier: current,
    salaryMultiplier: current.salaryMultiplier,
    nextTier,
    cyclesToNextTier: nextTier ? nextTier.minCycles - sectorCycles : null,
  };
}

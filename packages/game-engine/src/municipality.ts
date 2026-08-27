import {
  INFRASTRUCTURE_FUND_SCALE,
  MAX_INFRASTRUCTURE_ATTRACTIVENESS_BONUS,
  MAX_LOCAL_INFRASTRUCTURE_DEMAND_BONUS,
} from "@patrimoine-jeu/domain";

/** Même échelle "niveau de développement communal" (0-100) que les deux bonus ci-dessous en dépendent. */
function computeInfrastructureLevel(cumulativeFund: number): number {
  return Math.min(100, Math.sqrt(Math.max(0, cumulativeFund) / INFRASTRUCTURE_FUND_SCALE));
}

/**
 * Infrastructures communales (cf. domain/municipality-governance.ts) — le
 * fonds cumulé relève l'attractivité effective de TOUTES les entreprises de
 * la commune, à rendement décroissant (même forme que
 * companies.ts computeInvestmentLevel : racine carrée, jamais totalement
 * plafonné mais négligeable au-delà d'un certain point).
 */
export function computeInfrastructureAttractivenessBonus(cumulativeFund: number): number {
  return (computeInfrastructureLevel(cumulativeFund) / 100) * MAX_INFRASTRUCTURE_ATTRACTIVENESS_BONUS;
}

/**
 * "Plus d'habitants, donc plus de clients" — contrairement au bonus
 * d'attractivité ci-dessus (qui ne fait que redistribuer une part plus
 * grande d'un même gâteau national partagé entre concurrents du secteur),
 * ceci ajoute de la demande NETTE, propre à cette entreprise, qui ne vient
 * du panier d'aucun concurrent : investir dans sa commune fait vraiment
 * grossir sa clientèle locale, pas seulement sa part de marché.
 */
export function computeLocalInfrastructureDemandBonus(cumulativeFund: number): number {
  return (computeInfrastructureLevel(cumulativeFund) / 100) * MAX_LOCAL_INFRASTRUCTURE_DEMAND_BONUS;
}

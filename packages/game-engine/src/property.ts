import {
  CYCLES_PER_YEAR,
  PROPERTY_CONDITION_DECAY_PER_CYCLE,
  PROPERTY_CONDITION_DECAY_RENTED_MULTIPLIER,
  RENOVATION_COST_RATIO,
  RESIDENTIAL_PROPERTY_TYPES,
} from "@patrimoine-jeu/domain";

/**
 * Immobilier — cf. domain/property.ts pour les constantes de calibrage.
 */

/** Dégradation de l'état d'un bien à ce cycle — double si loué (usure du locataire). */
export function computePropertyConditionDecay(isRented: boolean): number {
  return PROPERTY_CONDITION_DECAY_PER_CYCLE * (isRented ? PROPERTY_CONDITION_DECAY_RENTED_MULTIPLIER : 1);
}

/** Loyer réellement perçu, réduit au prorata de l'état du bien — négliger l'entretien coûte directement en revenu. */
export function computeCollectedRent(baseRent: number, condition: number): number {
  return baseRent * (condition / 100);
}

/** Coût pour restaurer un bien à l'état neuf (100) — proportionnel à sa valeur, pas un montant fixe. */
export function computeRenovationCost(condition: number, marketValue: number): number {
  return (Math.max(0, 100 - condition) / 100) * marketValue * RENOVATION_COST_RATIO;
}

/** Précompte immobilier dû ce cycle (cf. domain/residence.ts) — le taux annuel de la commune, réparti sur CYCLES_PER_YEAR. */
export function computePropertyTaxPerCycle(marketValue: number, annualPropertyTaxRate: number): number {
  return (marketValue * annualPropertyTaxRate) / CYCLES_PER_YEAR;
}

export function isResidentialPropertyType(type: string): boolean {
  return (RESIDENTIAL_PROPERTY_TYPES as readonly string[]).includes(type);
}

export interface RegistrationDutyResult {
  rate: number;
  amount: number;
  isReducedRate: boolean;
}

/**
 * Droits d'enregistrement dus par l'acheteur, en plus du prix — cf.
 * domain/property.ts. Le taux réduit ne s'applique que pour un bien
 * résidentiel acheté par quelqu'un qui n'en possède encore aucun autre (le
 * vrai abattement "première habitation").
 */
export function computeRegistrationDuty(
  price: number,
  propertyType: string,
  standardRate: number,
  ownHomeRate: number,
  buyerAlreadyOwnsResidentialProperty: boolean,
): RegistrationDutyResult {
  const isReducedRate = isResidentialPropertyType(propertyType) && !buyerAlreadyOwnsResidentialProperty;
  const rate = isReducedRate ? ownHomeRate : standardRate;
  return { rate, amount: price * rate, isReducedRate };
}

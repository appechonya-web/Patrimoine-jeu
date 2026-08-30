import { z } from "zod";

/**
 * Finance & bilan d'entreprise — prêts bancaires à taux fixe (déterminé à
 * l'origine par le levier de risque, le ratio dette/fonds propres),
 * amortissement de l'équipement (actif physique dont la valeur comptable
 * décroît), et un bilan simplifié (actif = passif + capitaux propres, les
 * capitaux propres étant le solde, pas une valeur suivie indépendamment) —
 * cf. packages/game-engine/src/finance.ts.
 */

/** Taux annuel de base (économie stable, emprunteur sans risque particulier). */
export const BASE_LOAN_RATE = 0.04;
/** Prime de risque maximale ajoutée au taux de base pour une entreprise très endettée. */
export const LOAN_RISK_PREMIUM_MAX = 0.15;
/**
 * Ratio dette/fonds propres au-delà duquel la prime de risque est
 * intégralement appliquée (plafonnée) — à ce niveau d'endettement, la
 * banque considère l'entreprise à risque maximal, pas de surprime au-delà.
 */
export const REFERENCE_DEBT_EQUITY_RATIO = 1;

/** Emprunter plus de ce multiple des fonds propres est refusé — pas de surendettement illimité. */
export const MAX_LOAN_PRINCIPAL_EQUITY_RATIO = 2;

/**
 * Plancher utilisé au dénominateur du ratio dette/fonds propres — évite une
 * division par une valeur nulle ou négative (fonds propres en déficit) de
 * produire un ratio absurde ; en dessous de ce plancher, l'entreprise est de
 * toute façon dans la zone de risque maximal.
 */
export const EQUITY_FLOOR = 1_000;

export const LOAN_TERM_OPTIONS_CYCLES = [180, 365, 730] as const;
export type LoanTermCycles = (typeof LOAN_TERM_OPTIONS_CYCLES)[number];

export const MIN_LOAN_PRINCIPAL = 500;

/**
 * Amortissement linéaire de la valeur comptable de l'équipement (le seul
 * levier traité comme un actif physique — les autres sont des programmes/de
 * l'expertise, pas des machines). Calibré pour perdre environ la moitié de
 * sa valeur en ~700 cycles (~29 jours à raison d'1 cycle/heure), cohérent
 * avec le rythme d'engagement déjà utilisé ailleurs (maturité d'expansion,
 * paliers d'investissement).
 */
export const EQUIPMENT_DEPRECIATION_RATE_PER_CYCLE = 0.001;

/**
 * Pénalité de réputation d'entreprise (attractivité) infligée en cas de
 * défaut de paiement — durable, et bloque tout nouvel emprunt tant qu'un
 * prêt en défaut existe sur l'entreprise (cf. companies.service.ts).
 */
export const LOAN_DEFAULT_ATTRACTIVENESS_PENALTY = 15;

/**
 * Pénalité de remboursement anticipé, en % du solde restant dû — sans elle,
 * emprunter à taux fixe n'aurait aucun risque (on rembourse dès qu'on n'en a
 * plus besoin), ce qui viderait de son sens le choix de durée à la prise du
 * prêt.
 */
export const EARLY_LOAN_REPAYMENT_PENALTY_RATE = 0.02;

export const requestLoanInputSchema = z.object({
  principal: z.number().min(MIN_LOAN_PRINCIPAL),
  termCycles: z.union([z.literal(180), z.literal(365), z.literal(730)]),
});
export type RequestLoanInput = z.infer<typeof requestLoanInputSchema>;

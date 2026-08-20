import { z } from "zod";

/**
 * Assurance inter-joueurs (cf. section 12ter du document de conception) —
 * couvre les pertes des ALÉAS D'ENTREPRISE négatifs déjà existants
 * (company.ts rollCompanyEvent, après amortissement par les leviers
 * branding/insurance/réserve déjà en place) : un vrai "sinistre" ponctuel et
 * quantifiable à chaque cycle, plutôt que les variations de demande
 * continues du nouveau système d'aléas sectoriels (sectoral-events.ts), pas
 * assurables par nature (une conjoncture de marché n'est pas un incendie).
 *
 * Deux sources : une entreprise-joueur (offre publiée, prime + plafond
 * libres, payée par la trésorerie réelle de l'assuré — même schéma ouvert
 * que LoanOffer) avec un vrai risque de concentration (l'assureur ne peut
 * payer que ce que sa trésorerie permet, insolvabilité en cascade possible
 * si plusieurs sinistres tombent le même cycle) ; ou l'assureur système par
 * défaut (prime/plafond fixes, toujours solvable) — un choix
 * volontairement moins avantageux en probable rapport prime/couverture,
 * mais sans risque de contrepartie.
 */

export const MIN_INSURANCE_PREMIUM_PER_CYCLE = 1;
export const MIN_INSURANCE_COVERAGE_CAP = 10;

export const createInsuranceOfferInputSchema = z.object({
  premiumPerCycle: z.number().min(MIN_INSURANCE_PREMIUM_PER_CYCLE),
  coverageCap: z.number().min(MIN_INSURANCE_COVERAGE_CAP),
});
export type CreateInsuranceOfferInput = z.infer<typeof createInsuranceOfferInputSchema>;

/** Termes fixes de l'assureur système — toujours disponible, jamais insolvable. */
export const SYSTEM_INSURANCE_PREMIUM_PER_CYCLE = 15;
export const SYSTEM_INSURANCE_COVERAGE_CAP = 800;

import { z } from "zod";

/**
 * Usages sociaux de la richesse — investissement dans les infrastructures
 * communales + conseil communal jouable (cf. section 11 du document de
 * conception). "Investissement dans les infrastructures communales —
 * bénéfice partagé pour tous les joueurs de la zone, statut visible pour le
 * financeur" et "Conseil communal/chambre de commerce jouable — les joueurs
 * influents d'une zone peuvent peser sur certains paramètres locaux".
 *
 * Bénéfice partagé : un fonds communal cumulé (cf.
 * game-engine/municipality.ts, computeInfrastructureAttractivenessBonus)
 * relève l'attractivité effective de TOUTES les entreprises de la commune,
 * à rendement décroissant — même mécanique que les leviers d'investissement
 * d'entreprise (computeInvestmentLevel), à l'échelle communale plutôt
 * qu'individuelle.
 *
 * Conseil communal : le paramètre modifiable est le taux des droits
 * d'enregistrement immobiliers (Municipality.registrationDutyRate — un vrai
 * levier déjà branché sur chaque achat/prêt immobilier de la commune, cf.
 * properties.service.ts computeRegistrationDuty). additionalTaxRate reste
 * hors du champ du vote (le domicile fiscal choisi une fois pour toutes par
 * le joueur, cf. domain/residence.ts, ne doit pas pouvoir être détourné en
 * levier d'optimisation fiscale collective). Plafonné à une variation bornée pour éviter un vote qui casserait
 * l'équilibre fiscal. Poids de vote = contribution cumulée au fonds
 * d'infrastructure de CETTE commune (pas les parts d'une entreprise comme
 * pour l'AG d'entreprise, cf. domain/governance.ts, mais le même schéma de
 * résolution à l'expiration plutôt qu'un seuil de majorité instantané,
 * faute de "total" fixe comme le 100% des parts).
 */

export const MIN_INFRASTRUCTURE_CONTRIBUTION = 50;
/** Échelle de rendement décroissant du fonds communal — même forme que INVESTMENT_LEVEL_SCALE (racine carrée). */
export const INFRASTRUCTURE_FUND_SCALE = 8;
/** Bonus d'attractivité maximal atteignable (rendement décroissant, jamais totalement plafonné mais négligeable au-delà). */
export const MAX_INFRASTRUCTURE_ATTRACTIVENESS_BONUS = 15;
/**
 * "Plus d'habitants, plus de clients" (cf. game-engine/municipality.ts
 * computeLocalInfrastructureDemandBonus) — contrairement au bonus
 * d'attractivité ci-dessus (une part plus grande d'un marché national
 * partagé avec les concurrents du secteur), ceci ajoute de la demande NETTE
 * propre à chaque entreprise de la commune, qui ne vient du panier
 * d'aucun concurrent. Exprimé en fraction multiplicative (0.5 = jusqu'à
 * +50% de clients locaux en plus, au même niveau de développement communal
 * qui plafonne le bonus d'attractivité ci-dessus).
 */
export const MAX_LOCAL_INFRASTRUCTURE_DEMAND_BONUS = 0.5;

/**
 * Croissance démographique (cf. Municipality.population,
 * game-engine/municipality.ts computePopulationGrowthPerCycle) — deux
 * composantes par cycle : une croissance naturelle lente, proportionnelle
 * à la population déjà là (comme une vraie démographie), et un bonus
 * d'immigration proportionnel à la racine carrée du fonds d'infrastructure
 * de LA commune (pas le total national comme pour l'indice d'activité
 * économique) — investir dans SA commune fait grandir SA population, qui
 * contribue ensuite à la population nationale et donc à la demande de
 * TOUS les secteurs (cf. domain/market.ts).
 */
export const NATURAL_POPULATION_GROWTH_RATE = 0.0001;
export const POPULATION_GROWTH_SCALE = 0.05;

export const contributeToInfrastructureInputSchema = z.object({
  amount: z.number().min(MIN_INFRASTRUCTURE_CONTRIBUTION),
});
export type ContributeToInfrastructureInput = z.infer<typeof contributeToInfrastructureInputSchema>;

export const COUNCIL_PROPOSAL_DURATION_CYCLES = 14;
/** Variation maximale (en points) du taux de droits d'enregistrement qu'une proposition peut demander, dans un sens ou l'autre. */
export const MAX_REGISTRATION_DUTY_RATE_DELTA = 0.02;
/** Poids de vote cumulé minimal (contributions FOR) pour qu'une proposition soit valable — empêche un unique petit contributeur de décider seul. */
export const MIN_COUNCIL_QUORUM_WEIGHT = 500;

export const createCouncilProposalInputSchema = z.object({
  newRegistrationDutyRate: z.number().min(0.01).max(0.2),
});
export type CreateCouncilProposalInput = z.infer<typeof createCouncilProposalInputSchema>;

export const castCouncilVoteInputSchema = z.object({
  inFavor: z.boolean(),
});
export type CastCouncilVoteInput = z.infer<typeof castCouncilVoteInputSchema>;

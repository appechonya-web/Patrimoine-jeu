/**
 * Événements aléatoires sectoriels/régionaux (cf. section 12ter du document
 * de conception) — distinct des aléas d'entreprise isolés déjà en place
 * (company.ts EVENT_DEFINITIONS/rollCompanyEvent) : ceux-ci touchent TOUT un
 * secteur (et parfois un second secteur corrélé) plutôt qu'une seule
 * entreprise, via un multiplicateur de demande temporaire qui s'ajoute
 * par-dessus le score d'attractivité — le mérite continue de compter même
 * en plein choc sectoriel. Totalement aléatoires (jamais scriptés) : pas de
 * catalogue de scénarios nommés, juste un secteur (+ parfois un second,
 * corrélé) et une direction tirés au hasard à chaque déclenchement.
 *
 * Portée géographique : faute d'un marché partagé par secteur+commune (les
 * "pools" de marché du moteur de jeu sont partagés par secteur au niveau
 * national, cf. game-engine/cycles.ts marketPools), la portée réellement
 * mécanique se limite à RÉGIONALE (ajustement de l'attractivité effective
 * des seules entreprises de la région touchée) et NATIONALE (multiplicateur
 * appliqué au pool de marché entier du secteur) — pas de granularité
 * communale séparée pour l'instant.
 */

export const SECTORAL_EVENT_TIERS = ["MINOR", "MODERATE", "MAJOR", "EXCEPTIONAL"] as const;
export type SectoralEventTier = (typeof SECTORAL_EVENT_TIERS)[number];

export const SECTORAL_EVENT_SCOPES = ["REGIONAL", "NATIONAL"] as const;
export type SectoralEventScope = (typeof SECTORAL_EVENT_SCOPES)[number];

/** MINEUR/MOYEN restent régionaux (chocs locaux) ; MAJEUR/EXCEPTIONNEL sont toujours nationaux (chocs sévères, cf. section 12ter). */
export const SECTORAL_EVENT_SCOPE_BY_TIER: Record<SectoralEventTier, SectoralEventScope> = {
  MINOR: "REGIONAL",
  MODERATE: "REGIONAL",
  MAJOR: "NATIONAL",
  EXCEPTIONAL: "NATIONAL",
};

/** Probabilité de déclenchement PAR CYCLE, indépendante par palier — le plus rare qui se déclenche un cycle donné l'emporte. */
export const SECTORAL_EVENT_TIER_PROBABILITY: Record<SectoralEventTier, number> = {
  MINOR: 0.03,
  MODERATE: 0.006,
  MAJOR: 0.0008,
  EXCEPTIONAL: 0.00008,
};

export const SECTORAL_EVENT_TIER_MAGNITUDE: Record<SectoralEventTier, { min: number; range: number }> = {
  MINOR: { min: 0.03, range: 0.05 },
  MODERATE: { min: 0.08, range: 0.12 },
  MAJOR: { min: 0.2, range: 0.25 },
  EXCEPTIONAL: { min: 0.45, range: 0.45 },
};

export const SECTORAL_EVENT_TIER_DURATION_CYCLES: Record<SectoralEventTier, number> = {
  MINOR: 5,
  MODERATE: 15,
  MAJOR: 40,
  EXCEPTIONAL: 80,
};

/** Signal faible en presse avant le début des effets — 0 = surprise totale (mineurs/moyens/exceptionnels, cf. section 12ter). */
export const SECTORAL_EVENT_TIER_WARNING_CYCLES: Record<SectoralEventTier, number> = {
  MINOR: 0,
  MODERATE: 0,
  MAJOR: 5,
  EXCEPTIONAL: 0,
};

/** Probabilité qu'un second secteur, corrélé, soit touché en même temps (effets corrélés, pas isolés — cf. section 12ter). */
export const SECTORAL_EVENT_CORRELATION_PROBABILITY = 0.45;
/** Le secteur corrélé subit une fraction de l'amplitude du secteur primaire — un choc secondaire, pas un doublon. */
export const SECTORAL_EVENT_CORRELATION_MAGNITUDE_MIN_RATIO = 0.4;
export const SECTORAL_EVENT_CORRELATION_MAGNITUDE_RANGE_RATIO = 0.3;

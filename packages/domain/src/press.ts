/**
 * Presse économique (cf. sections 11 et 12bis du document de conception) —
 * un fil PUBLIC de titres relayant les scandales et réussites du jeu, visible
 * par tous les joueurs sans distinction, à la différence de
 * PlayerNotification (cf. notifications.ts) qui reste privée par joueur.
 * Généré uniquement côté serveur (cycles.ts / services API) au moment de
 * l'événement — aucune entrée possible côté joueur.
 */

export const PRESS_CATEGORIES = [
  "BANKRUPTCY",
  "CARTEL_BUST",
  "HOSTILE_TAKEOVER",
  "AUCTION_WON",
  "SECTORAL_SHOCK_WARNING",
  "SECTORAL_SHOCK",
  "COUNCIL_DECISION",
] as const;
export type PressCategory = (typeof PRESS_CATEGORIES)[number];

export const PRESS_CATEGORY_ICONS: Record<PressCategory, string> = {
  BANKRUPTCY: "💥",
  CARTEL_BUST: "🚨",
  HOSTILE_TAKEOVER: "⚔️",
  AUCTION_WON: "🔨",
  SECTORAL_SHOCK_WARNING: "📡",
  SECTORAL_SHOCK: "🌪️",
  COUNCIL_DECISION: "🏛️",
};

export const PRESS_CATEGORY_LABELS: Record<PressCategory, string> = {
  BANKRUPTCY: "Faillite",
  CARTEL_BUST: "Cartel démantelé",
  HOSTILE_TAKEOVER: "Rachat hostile",
  AUCTION_WON: "Enchère immobilière",
  SECTORAL_SHOCK_WARNING: "Signal faible",
  SECTORAL_SHOCK: "Choc sectoriel",
  COUNCIL_DECISION: "Conseil communal",
};

export const PRESS_FEED_DEFAULT_LIMIT = 30;

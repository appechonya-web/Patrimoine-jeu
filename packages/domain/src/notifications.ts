/**
 * Journal d'événements — la plupart des événements marquants du jeu
 * (aléas d'entreprise, défauts de paiement, saisies, maturité d'un compte
 * d'épargne, prise d'une offre de prêt...) se produisaient déjà mais ne
 * laissaient aucune trace visible pour le joueur concerné. Les messages
 * sont composés côté serveur (cycles.ts / services API) au moment de
 * l'événement — ce catalogue ne sert qu'à choisir la bonne icône côté
 * frontend.
 */

export const NOTIFICATION_TYPES = [
  "company-event",
  "company-loan-default",
  "mortgage-default",
  "community-loan-default",
  "savings-matured",
  "loan-offer-taken",
  "property-sold",
  "share-sold",
  "life-event-positive",
  "life-event-negative",
  "auction-won",
  "auction-default",
  "auction-no-bid",
  "independent-activity-stopped",
  "achievement-unlocked",
  "company-bankrupt",
  "guild-dissolved",
  "donation-received",
  "hostile-takeover",
  "job-posting-filled",
  "job-lost",
  "employee-departed",
  "insurance-claim-paid",
  "insurance-payout-made",
  "insurance-lapsed",
  "insurance-offer-taken",
  "sale-bid-received",
  "sale-bid-accepted",
  "sale-bid-rejected",
  "capital-raise-funded",
  "capital-raise-control-lost",
  "proposal-created",
  "proposal-approved",
  "proposal-rejected",
  "bank-failure-full-refund",
  "bank-failure-partial-loss",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  "company-event": "🎲",
  "company-loan-default": "❌",
  "mortgage-default": "🏚️",
  "community-loan-default": "⚠️",
  "savings-matured": "🐷",
  "loan-offer-taken": "🏦",
  "property-sold": "🏘️",
  "share-sold": "📊",
  "life-event-positive": "🍀",
  "life-event-negative": "💥",
  "auction-won": "🔨",
  "auction-default": "⛔",
  "auction-no-bid": "📭",
  "independent-activity-stopped": "💼",
  "achievement-unlocked": "🏅",
  "company-bankrupt": "💥",
  "guild-dissolved": "🚨",
  "donation-received": "🎁",
  "hostile-takeover": "⚔️",
  "job-posting-filled": "🧑‍💼",
  "job-lost": "📤",
  "employee-departed": "🚶",
  "insurance-claim-paid": "🛡️",
  "insurance-payout-made": "💸",
  "insurance-lapsed": "⚠️",
  "insurance-offer-taken": "🤝",
  "sale-bid-received": "🤝",
  "sale-bid-accepted": "🎉",
  "sale-bid-rejected": "📉",
  "capital-raise-funded": "💰",
  "capital-raise-control-lost": "⚠️",
  "proposal-created": "🗳️",
  "proposal-approved": "✅",
  "proposal-rejected": "❌",
  "bank-failure-full-refund": "🏦",
  "bank-failure-partial-loss": "💸",
};

export const NOTIFICATIONS_DEFAULT_LIMIT = 30;

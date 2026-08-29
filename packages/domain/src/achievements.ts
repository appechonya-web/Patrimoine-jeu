/**
 * Défis de première fois — un petit bonus unique la première fois qu'un
 * joueur franchit une étape clé du jeu (premier emploi, premier petit
 * boulot...). Pensé pour le tout début de partie, en complément des
 * petits boulots (revenu répétable) : ici, une récompense ponctuelle qui
 * crée un sentiment de progression dès l'inscription. Détection faite côté
 * services concernés (employment, gigs, properties, companies, savings) via
 * un appel idempotent — rejouer l'action déclenchante ne rapporte rien de
 * plus, cf. apps/api AchievementsService.tryUnlock.
 *
 * Jalons de progression moyen terme (audit d'équilibrage) — même mécanisme
 * idempotent, mais détectés à la clôture de cycle plutôt que sur une action
 * ponctuelle (cf. game-engine/cycles.ts), puisqu'ils portent sur des seuils
 * CUMULATIFS (patrimoine net, profit d'entreprise, niveau d'un levier) qui
 * n'ont pas de "moment déclencheur" unique. Comblent l'écart identifié par
 * l'audit entre les cooldowns courts (7-14 cycles) et le premier palier long
 * terme (728 cycles, ~1 mois à raison d'1 cycle/heure) : les trois paliers
 * de chaque piste sont calibrés pour tomber entre ~2 jours et ~3 semaines
 * réelles sous cette cadence.
 */

export const ACHIEVEMENT_IDS = [
  "first-job",
  "first-gig",
  "first-property",
  "first-company",
  "first-savings",
  "first-quiz",
  "first-asset-trade",
  "first-donation",
  "networth-5k",
  "networth-20k",
  "networth-75k",
  "networth-250k",
  "networth-1m",
  "networth-10m",
  "company-profit-1k",
  "company-profit-5k",
  "company-profit-10k",
  "company-profit-50k",
  "company-profit-250k",
  "company-profit-1m",
  "investment-level-25",
  "investment-level-50",
  "investment-level-75",
  "investment-level-100",
  "investment-level-150",
  "investment-level-200",
  "wellbeing-70",
  "wellbeing-85",
  "wellbeing-95",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface AchievementDefinition {
  id: AchievementId;
  label: string;
  description: string;
  reward: number;
}

export const ACHIEVEMENT_CATALOG: Record<AchievementId, AchievementDefinition> = {
  "first-job": {
    id: "first-job",
    label: "Premier emploi",
    description: "Décrocher son premier poste.",
    reward: 50,
  },
  "first-gig": {
    id: "first-gig",
    label: "Premier petit boulot",
    description: "Gagner ses premiers euros par un petit boulot.",
    reward: 10,
  },
  "first-property": {
    id: "first-property",
    label: "Premier bien immobilier",
    description: "Devenir propriétaire pour la première fois.",
    reward: 100,
  },
  "first-company": {
    id: "first-company",
    label: "Première entreprise",
    description: "Fonder sa première entreprise.",
    reward: 150,
  },
  "first-savings": {
    id: "first-savings",
    label: "Premier compte d'épargne",
    description: "Ouvrir son premier compte d'épargne.",
    reward: 20,
  },
  "first-quiz": {
    id: "first-quiz",
    label: "Premier quiz réussi",
    description: "Répondre correctement à sa première question du quiz fiscal.",
    reward: 15,
  },
  "first-asset-trade": {
    id: "first-asset-trade",
    label: "Premier investissement",
    description: "Acheter sa première action, cryptomonnaie ou œuvre d'art.",
    reward: 15,
  },
  "first-donation": {
    id: "first-donation",
    label: "Premier don",
    description: "Faire un premier don, à un autre joueur ou à une cause reconnue.",
    reward: 15,
  },
  "networth-5k": {
    id: "networth-5k",
    label: "5 000 € de patrimoine net",
    description: "Atteindre 5 000 € de patrimoine net cumulé (cash, immobilier, entreprises, épargne).",
    reward: 50,
  },
  "networth-20k": {
    id: "networth-20k",
    label: "20 000 € de patrimoine net",
    description: "Atteindre 20 000 € de patrimoine net cumulé.",
    reward: 150,
  },
  "networth-75k": {
    id: "networth-75k",
    label: "75 000 € de patrimoine net",
    description: "Atteindre 75 000 € de patrimoine net cumulé.",
    reward: 400,
  },
  "networth-250k": {
    id: "networth-250k",
    label: "250 000 € de patrimoine net",
    description: "Atteindre 250 000 € de patrimoine net cumulé.",
    reward: 800,
  },
  "networth-1m": {
    id: "networth-1m",
    label: "1 million € de patrimoine net",
    description: "Atteindre 1 000 000 € de patrimoine net cumulé — le club des millionnaires.",
    reward: 2_000,
  },
  "networth-10m": {
    id: "networth-10m",
    label: "10 millions € de patrimoine net",
    description: "Atteindre 10 000 000 € de patrimoine net cumulé — parmi les tout meilleurs joueurs.",
    reward: 5_000,
  },
  "company-profit-1k": {
    id: "company-profit-1k",
    label: "1 000 € de profit cumulé",
    description: "Une de tes entreprises franchit 1 000 € de profit net cumulé.",
    reward: 40,
  },
  "company-profit-5k": {
    id: "company-profit-5k",
    label: "5 000 € de profit cumulé",
    description: "Une de tes entreprises franchit 5 000 € de profit net cumulé.",
    reward: 120,
  },
  "company-profit-10k": {
    id: "company-profit-10k",
    label: "10 000 € de profit cumulé",
    description: "Une de tes entreprises franchit 10 000 € de profit net cumulé — à mi-chemin du seuil d'expansion.",
    reward: 300,
  },
  "company-profit-50k": {
    id: "company-profit-50k",
    label: "50 000 € de profit cumulé",
    description: "Une de tes entreprises franchit 50 000 € de profit net cumulé.",
    reward: 600,
  },
  "company-profit-250k": {
    id: "company-profit-250k",
    label: "250 000 € de profit cumulé",
    description: "Une de tes entreprises franchit 250 000 € de profit net cumulé.",
    reward: 1_500,
  },
  "company-profit-1m": {
    id: "company-profit-1m",
    label: "1 million € de profit cumulé",
    description: "Une de tes entreprises franchit 1 000 000 € de profit net cumulé.",
    reward: 4_000,
  },
  "investment-level-25": {
    id: "investment-level-25",
    label: "Levier au niveau 25",
    description: "Un levier d'investissement (entreprise ou personnel) atteint le niveau 25.",
    reward: 30,
  },
  "investment-level-50": {
    id: "investment-level-50",
    label: "Levier au niveau 50",
    description: "Un levier d'investissement (entreprise ou personnel) atteint le niveau 50.",
    reward: 80,
  },
  "investment-level-75": {
    id: "investment-level-75",
    label: "Levier au niveau 75",
    description: "Un levier d'investissement (entreprise ou personnel) atteint le niveau 75.",
    reward: 200,
  },
  "investment-level-100": {
    id: "investment-level-100",
    label: "Levier au niveau 100",
    description: "Un levier d'investissement (entreprise ou personnel) atteint le plafond de base (niveau 100).",
    reward: 350,
  },
  "investment-level-150": {
    id: "investment-level-150",
    label: "Levier au niveau 150 (palier mondial)",
    description: "Un levier d'investissement d'entreprise dépasse le plafond de base grâce au palier mondial (niveau 150).",
    reward: 600,
  },
  "investment-level-200": {
    id: "investment-level-200",
    label: "Levier au niveau 200 (palier mondial maximal)",
    description: "Un levier d'investissement d'entreprise atteint le plafond absolu du palier mondial (niveau 200).",
    reward: 1_000,
  },
  "wellbeing-70": {
    id: "wellbeing-70",
    label: "Épanoui",
    description: "Atteindre 70/100 de bien-être — le seuil qui déclenche le bonus de revenu.",
    reward: 30,
  },
  "wellbeing-85": {
    id: "wellbeing-85",
    label: "Radieux",
    description: "Atteindre 85/100 de bien-être.",
    reward: 80,
  },
  "wellbeing-95": {
    id: "wellbeing-95",
    label: "Zen total",
    description: "Atteindre 95/100 de bien-être — quasiment le maximum.",
    reward: 200,
  },
};
export const ACHIEVEMENT_LIST: AchievementDefinition[] = Object.values(ACHIEVEMENT_CATALOG);

export interface AchievementMilestone {
  id: AchievementId;
  threshold: number;
}

/**
 * Patrimoine net cumulé (PlayerStats.netWorth) — vérifié à chaque clôture de
 * cycle. Les trois derniers paliers (250k/1M/10M) n'existent que depuis que
 * le holding, la valorisation par rentabilité et le palier mondial (cf.
 * domain/valorization.ts) ont ouvert une vraie échelle de richesse
 * multiplicative, au-delà de ce que la valeur comptable seule permettait.
 */
export const NET_WORTH_MILESTONES: AchievementMilestone[] = [
  { id: "networth-5k", threshold: 5_000 },
  { id: "networth-20k", threshold: 20_000 },
  { id: "networth-75k", threshold: 75_000 },
  { id: "networth-250k", threshold: 250_000 },
  { id: "networth-1m", threshold: 1_000_000 },
  { id: "networth-10m", threshold: 10_000_000 },
];

/** Profit net cumulé d'une entreprise (Company.cumulativeNetProfit) — le maximum sur toutes les entreprises possédées. */
export const COMPANY_PROFIT_MILESTONES: AchievementMilestone[] = [
  { id: "company-profit-1k", threshold: 1_000 },
  { id: "company-profit-5k", threshold: 5_000 },
  { id: "company-profit-10k", threshold: 10_000 },
  { id: "company-profit-50k", threshold: 50_000 },
  { id: "company-profit-250k", threshold: 250_000 },
  { id: "company-profit-1m", threshold: 1_000_000 },
];

/**
 * Niveau d'un levier d'investissement (0-100 pour un levier personnel,
 * jusqu'à 200 pour un levier d'entreprise grâce au palier mondial — cf.
 * computeEffectiveInvestmentLevel) — le maximum sur tous les leviers de
 * toutes les entreprises possédées, et les leviers personnels.
 */
export const INVESTMENT_LEVEL_MILESTONES: AchievementMilestone[] = [
  { id: "investment-level-25", threshold: 25 },
  { id: "investment-level-50", threshold: 50 },
  { id: "investment-level-75", threshold: 75 },
  { id: "investment-level-100", threshold: 100 },
  { id: "investment-level-150", threshold: 150 },
  { id: "investment-level-200", threshold: 200 },
];

/**
 * Bien-être (PlayerStats.wellbeing, 0-100) — vérifié à chaque clôture de
 * cycle comme les autres pistes, mais contrairement à elles ce n'est PAS
 * cumulatif : le bien-être fluctue dans les deux sens. Un palier une fois
 * atteint reste débloqué pour toujours (même sémantique que les autres
 * jalons — "as-tu déjà atteint X", pas "es-tu actuellement à X").
 */
export const WELLBEING_MILESTONES: AchievementMilestone[] = [
  { id: "wellbeing-70", threshold: 70 },
  { id: "wellbeing-85", threshold: 85 },
  { id: "wellbeing-95", threshold: 95 },
];

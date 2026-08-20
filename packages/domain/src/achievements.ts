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
  "company-profit-1k",
  "company-profit-5k",
  "company-profit-10k",
  "investment-level-25",
  "investment-level-50",
  "investment-level-75",
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
};
export const ACHIEVEMENT_LIST: AchievementDefinition[] = Object.values(ACHIEVEMENT_CATALOG);

export interface AchievementMilestone {
  id: AchievementId;
  threshold: number;
}

/** Patrimoine net cumulé (PlayerStats.netWorth) — vérifié à chaque clôture de cycle. */
export const NET_WORTH_MILESTONES: AchievementMilestone[] = [
  { id: "networth-5k", threshold: 5_000 },
  { id: "networth-20k", threshold: 20_000 },
  { id: "networth-75k", threshold: 75_000 },
];

/** Profit net cumulé d'une entreprise (Company.cumulativeNetProfit) — le maximum sur toutes les entreprises possédées. */
export const COMPANY_PROFIT_MILESTONES: AchievementMilestone[] = [
  { id: "company-profit-1k", threshold: 1_000 },
  { id: "company-profit-5k", threshold: 5_000 },
  { id: "company-profit-10k", threshold: 10_000 },
];

/** Niveau d'un levier d'investissement d'entreprise (0-100, cf. computeInvestmentLevel) — le maximum sur les 10 leviers de toutes les entreprises possédées. */
export const INVESTMENT_LEVEL_MILESTONES: AchievementMilestone[] = [
  { id: "investment-level-25", threshold: 25 },
  { id: "investment-level-50", threshold: 50 },
  { id: "investment-level-75", threshold: 75 },
];

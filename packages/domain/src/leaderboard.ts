/**
 * Classements — exploite PlayerStatHistory (jusqu'ici alimenté à chaque
 * clôture de cycle mais jamais lu, cf. son commentaire d'origine "alimente
 * les classements de croissance récente"). Le patrimoine total (netWorth)
 * combine cash + équité immobilière + quote-part dans les entreprises +
 * valorisation des matières premières (cf. packages/game-engine/cycles.ts).
 */

export const LEADERBOARD_METRICS = ["networth", "growth", "reputation", "experience"] as const;
export type LeaderboardMetric = (typeof LEADERBOARD_METRICS)[number];

export const LEADERBOARD_METRIC_LABELS: Record<LeaderboardMetric, string> = {
  networth: "💰 Patrimoine total",
  growth: "📈 Croissance",
  reputation: "⭐ Réputation",
  experience: "🎓 Expérience",
};

/** Fenêtres de croissance en cycles — un cycle = un jour (cf. domain/employment.ts, CYCLES_PER_YEAR). */
export const LEADERBOARD_GROWTH_WINDOWS_CYCLES = [7, 30, 90] as const;
export type LeaderboardGrowthWindowCycles = (typeof LEADERBOARD_GROWTH_WINDOWS_CYCLES)[number];

export const LEADERBOARD_DEFAULT_LIMIT = 20;

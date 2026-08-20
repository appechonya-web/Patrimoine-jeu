import {
  DAILY_BONUS_BASE,
  DAILY_BONUS_INCREMENT_PER_STREAK_DAY,
  DAILY_BONUS_MAX_STREAK_DAYS,
} from "@patrimoine-jeu/domain";

/** Récompense du bonus de connexion pour un streak donné (jour 1, 2, 3...) — plafonnée, cf. domain/engagement.ts. */
export function computeDailyBonusReward(streakDay: number): number {
  const cappedStreak = Math.min(streakDay, DAILY_BONUS_MAX_STREAK_DAYS);
  return DAILY_BONUS_BASE + DAILY_BONUS_INCREMENT_PER_STREAK_DAY * (cappedStreak - 1);
}

/** Deux dates calendaires (UTC, format "YYYY-MM-DD") se suivent-elles de exactement un jour ? */
export function isConsecutiveCalendarDay(lastDateISO: string, todayDateISO: string): boolean {
  const last = new Date(`${lastDateISO}T00:00:00Z`).getTime();
  const today = new Date(`${todayDateISO}T00:00:00Z`).getTime();
  return Math.round((today - last) / 86_400_000) === 1;
}

export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

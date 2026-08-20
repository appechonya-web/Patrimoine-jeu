"use client";

import { useEffect, useState } from "react";
import {
  LEADERBOARD_GROWTH_WINDOWS_CYCLES,
  LEADERBOARD_METRICS,
  LEADERBOARD_METRIC_LABELS,
  type LeaderboardGrowthWindowCycles,
  type LeaderboardMetric,
} from "@patrimoine-jeu/domain";
import type { LeaderboardEntry } from "../../lib/session";
import { GameError, fetchLeaderboard } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function formatValue(metric: LeaderboardMetric, value: number): string {
  if (metric === "networth" || metric === "growth") {
    const sign = metric === "growth" && value > 0 ? "+" : "";
    return `${sign}${currencyFormatter.format(value)}`;
  }
  return value.toFixed(metric === "reputation" ? 1 : 0);
}

export function LeaderboardView({ initialEntries }: { initialEntries: LeaderboardEntry[] }) {
  const [metric, setMetric] = useState<LeaderboardMetric>("networth");
  const [windowCycles, setWindowCycles] = useState<LeaderboardGrowthWindowCycles>(30);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLeaderboard(metric, windowCycles)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof GameError ? err.message : "Une erreur est survenue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, windowCycles]);

  return (
    <section className={styles.section}>
      <div className={styles.tabBar}>
        {LEADERBOARD_METRICS.map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.tabButton} ${metric === m ? styles.tabButtonActive : ""}`}
            onClick={() => setMetric(m)}
          >
            {LEADERBOARD_METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {metric === "growth" && (
        <div className={styles.tabBar}>
          {LEADERBOARD_GROWTH_WINDOWS_CYCLES.map((w) => (
            <button
              key={w}
              type="button"
              className={`${styles.tabButton} ${windowCycles === w ? styles.tabButtonActive : ""}`}
              onClick={() => setWindowCycles(w)}
            >
              {w} jours
            </button>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.jobList} style={{ opacity: loading ? 0.6 : 1 }}>
        {entries.map((entry, index) => {
          const previous = entries[index - 1];
          const showGap = index > 0 && previous !== undefined && entry.rank !== previous.rank + 1;
          return (
            <div key={entry.playerId}>
              {showGap && <p className={styles.jobMeta}>···</p>}
              <div className={`${styles.jobCard} ${entry.isMe ? styles.jobCardMe : ""}`}>
                <div>
                  <span className={styles.rankBadge}>#{entry.rank}</span>
                  <span className={styles.jobTitle}>{entry.pseudo}</span>
                  {entry.isMe && <span className={styles.jobMeta}> (toi)</span>}
                </div>
                <div className={styles.jobSalary}>{formatValue(metric, entry.value)}</div>
              </div>
            </div>
          );
        })}
        {entries.length === 0 && !loading && <p className={styles.jobMeta}>Personne à classer pour l'instant.</p>}
      </div>
    </section>
  );
}

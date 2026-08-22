"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CapitalRaiseView } from "../../lib/session";
import { GameError, fundCapitalRaise } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function RaiseCard({ raise }: { raise: CapitalRaiseView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFund() {
    setError(null);
    setPending(true);
    try {
      await fundCapitalRaise(raise.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          <Link href={`/companies/${raise.companyId}`}>{raise.companyName}</Link>
        </div>
        <div className={styles.jobMeta}>
          {raise.sector} — {raise.municipality}
        </div>
        <div className={styles.jobStats}>
          <span>🧩 {raise.newSharePercentage}% de nouvelles parts</span>
          <span>⏳ {raise.cyclesRemaining} cycles restants</span>
        </div>
        <div className={styles.jobStats}>
          <span>📅 {raise.companyAgeCycles} cycles d'ancienneté</span>
          <span>
            {raise.cumulativeNetProfit >= 0 ? "📈" : "📉"} {currencyFormatter.format(raise.cumulativeNetProfit)} de
            profit cumulé
          </span>
          <span>🏦 {currencyFormatter.format(raise.cashReserve)} de trésorerie</span>
          <span>⭐ Attractivité {raise.attractivenessScore.toFixed(1)}</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(raise.targetAmount)}</div>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleFund}>
          {pending ? "…" : "💰 Financer"}
        </button>
      </div>
    </div>
  );
}

export function CapitalRaiseList({ raises }: { raises: CapitalRaiseView[] }) {
  if (raises.length === 0) {
    return <p className={styles.jobMeta}>Aucune levée de fonds en cours pour l'instant. 🕊️</p>;
  }

  return (
    <div className={styles.jobList}>
      {raises.map((raise) => (
        <RaiseCard key={raise.id} raise={raise} />
      ))}
    </div>
  );
}

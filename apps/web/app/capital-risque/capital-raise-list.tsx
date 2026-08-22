"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MIN_CAPITAL_RAISE_CONTRIBUTION } from "@patrimoine-jeu/domain";
import type { CapitalRaiseContributionView, CapitalRaiseView } from "../../lib/session";
import { GameError, fundCapitalRaise, getCapitalRaiseContributions } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function ContributorsList({ raiseId }: { raiseId: string }) {
  const [contributions, setContributions] = useState<CapitalRaiseContributionView[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (contributions !== null) {
      setContributions(null);
      return;
    }
    setLoading(true);
    try {
      setContributions(await getCapitalRaiseContributions(raiseId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button className={styles.logout} type="button" onClick={toggle} disabled={loading}>
        {loading ? "…" : contributions === null ? "👥 Voir les investisseurs" : "Masquer"}
      </button>
      {contributions !== null && (
        <div className={styles.jobStats} style={{ marginTop: "0.5rem" }}>
          {contributions.length === 0 ? (
            <span>Aucun investisseur pour l'instant.</span>
          ) : (
            contributions.map((c) => (
              <span key={c.investorPseudo}>
                {c.investorPseudo} : {currencyFormatter.format(c.amount)} ({c.sharePercentage.toFixed(2)}%)
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RaiseCard({ raise }: { raise: CapitalRaiseView }) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.min(raise.remainingAmount, MIN_CAPITAL_RAISE_CONTRIBUTION * 5));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const progress = Math.min(100, (raise.amountRaised / raise.targetAmount) * 100);

  async function handleFund(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await fundCapitalRaise(raise.id, amount);
      setNotice(
        result.fullyFunded
          ? `Levée entièrement financée avec ta contribution de ${currencyFormatter.format(result.contributed)} !`
          : `Contribution de ${currencyFormatter.format(result.contributed)} enregistrée.`,
      );
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
          <span>🧩 {raise.newSharePercentage}% de nouvelles parts au total</span>
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
        <div className={styles.meter} style={{ marginTop: "0.6rem", marginBottom: "0.4rem" }}>
          <div className={styles.meterHeader}>
            <span>
              {currencyFormatter.format(raise.amountRaised)} / {currencyFormatter.format(raise.targetAmount)}
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className={styles.meterTrack}>
            <div className={styles.meterFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <ContributorsList raiseId={raise.id} />
        {notice && <p className={styles.jobMeta}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(raise.remainingAmount)} restants</div>
        <form className={styles.form} onSubmit={handleFund}>
          <input
            className={styles.formInput}
            type="number"
            min={MIN_CAPITAL_RAISE_CONTRIBUTION}
            max={raise.remainingAmount}
            step={10}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <button className={styles.apply} type="submit" disabled={pending}>
            {pending ? "…" : "💰 Financer"}
          </button>
        </form>
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

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MIN_CAPITAL_RAISE_CONTRIBUTION } from "@patrimoine-jeu/domain";
import type { CapitalRaiseContributionView, CapitalRaiseView } from "../../lib/session";
import { GameError, fundCapitalRaise, getCapitalRaiseContributions } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { StatHint } from "../stat-hint";
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

function RaiseCard({ raise, myControlledCompanies }: { raise: CapitalRaiseView; myControlledCompanies: { id: string; name: string }[] }) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.min(raise.remainingAmount, MIN_CAPITAL_RAISE_CONTRIBUTION * 5));
  const [investorCompanyId, setInvestorCompanyId] = useState("");
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
      const result = await fundCapitalRaise(raise.id, amount, investorCompanyId || undefined);
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
          <span>
            <StatHint hint="Part totale du capital que CETTE levée émet en nouvelles actions, répartie entre tous les investisseurs proportionnellement à leur contribution — dilue mécaniquement tous les actionnaires déjà en place.">
              🧩 {raise.newSharePercentage}% de nouvelles parts au total
            </StatHint>
          </span>
          <span>
            <StatHint hint="Temps restant avant que cette levée ne se ferme. Les contributions déjà faites restent acquises (argent transféré, parts déjà attribuées) même si la levée n'atteint jamais sa cible — seule la possibilité d'investir dessus disparaît après ce délai.">
              ⏳ {raise.cyclesRemaining} cycles restants
            </StatHint>
          </span>
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Depuis combien de cycles cette entreprise existe — une jeune entreprise a eu moins de temps pour prouver sa rentabilité, une vraie information de risque avant d'investir.">
              📅 {raise.companyAgeCycles} cycles d'ancienneté
            </StatHint>
          </span>
          <span>
            <StatHint hint="Somme des profits nets de cette entreprise depuis sa fondation, jamais remise à zéro — proche de zéro ou négatif, c'est un signal d'alerte avant d'investir.">
              {raise.cumulativeNetProfit >= 0 ? "📈" : "📉"} {currencyFormatter.format(raise.cumulativeNetProfit)} de
              profit cumulé
            </StatHint>
          </span>
          <span>
            <StatHint hint="Cash immédiatement disponible dans l'entreprise — une trésorerie faible la rend plus fragile face à un cycle difficile (loyers, salaires, remboursements de prêt).">
              🏦 {currencyFormatter.format(raise.cashReserve)} de trésorerie
            </StatHint>
          </span>
          <span>
            <StatHint hint="Force commerciale de l'entreprise sur son marché — plus elle est élevée, plus l'entreprise capte de demande face à ses concurrents du même secteur.">
              ⭐ Attractivité {raise.attractivenessScore.toFixed(1)}
            </StatHint>
          </span>
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
          {myControlledCompanies.length > 0 && (
            <select
              className={styles.formInput}
              value={investorCompanyId}
              onChange={(e) => setInvestorCompanyId(e.target.value)}
            >
              <option value="">Financer en mon nom propre</option>
              {myControlledCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  🏢 Financer en tant que {c.name}
                </option>
              ))}
            </select>
          )}
          <button className={styles.apply} type="submit" disabled={pending}>
            {pending ? "…" : "💰 Financer"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function CapitalRaiseList({
  raises,
  myControlledCompanies,
}: {
  raises: CapitalRaiseView[];
  myControlledCompanies: { id: string; name: string }[];
}) {
  if (raises.length === 0) {
    return <p className={styles.jobMeta}>Aucune levée de fonds en cours pour l'instant. 🕊️</p>;
  }

  return (
    <div className={styles.jobList}>
      {raises.map((raise) => (
        <RaiseCard key={raise.id} raise={raise} myControlledCompanies={myControlledCompanies} />
      ))}
    </div>
  );
}

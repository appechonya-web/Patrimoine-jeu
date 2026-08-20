"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { EmploymentView, IndependentActivityView } from "../lib/session";
import {
  GameError,
  estimateIndependentActivity,
  startIndependentActivity,
  stopIndependentActivity,
  type IndependentActivityEstimate,
} from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function IndependentActivityInfoTip() {
  return (
    <InfoTip
      label="💼"
      title="Indépendant complémentaire"
      mechanic="Revenu annexe en plus de ton emploi principal, sans forfait minimum trimestriel — mais agrégé à ton salaire pour le calcul de l'impôt : chaque euro gagné en plus est taxé à ta tranche marginale actuelle, pas à un taux forfaitaire à part."
      realWorld="C'est exactement le statut belge d'indépendant à titre complémentaire : contrairement à l'indépendant à titre principal (cotisations sociales minimales obligatoires même sans revenu), le complémentaire ne paie des cotisations que sur ce qu'il gagne réellement — mais son revenu s'ajoute à son salaire pour l'impôt des personnes physiques, ce qui peut faire grimper vite le taux marginal réel."
    />
  );
}

function StartActivityForm({ onDone }: { onDone: () => void }) {
  const [grossRevenuePerCycle, setGrossRevenuePerCycle] = useState(30);
  const [estimate, setEstimate] = useState<IndependentActivityEstimate | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (grossRevenuePerCycle <= 0) {
      setEstimate(null);
      return;
    }
    let cancelled = false;
    estimateIndependentActivity(grossRevenuePerCycle)
      .then((result) => {
        if (!cancelled) setEstimate(result);
      })
      .catch(() => {
        if (!cancelled) setEstimate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [grossRevenuePerCycle]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await startIndependentActivity(grossRevenuePerCycle);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={1}
        step={5}
        value={grossRevenuePerCycle}
        onChange={(e) => setGrossRevenuePerCycle(Number(e.target.value))}
      />
      {estimate && (
        <p className={styles.jobMeta}>
          Cotisations sociales ~{currencyFormatter.format(estimate.socialContributionsPerCycle)}/cycle — taux
          marginal réel {(estimate.marginalTaxRateOnSide * 100).toFixed(0)}% (s'ajoute à ton salaire) — net estimé{" "}
          {currencyFormatter.format(estimate.netPerCycle)}/cycle.
        </p>
      )}
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "💼 Démarrer l'activité"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function IndependentActivitySection({
  employment,
  activity,
}: {
  employment: EmploymentView | null;
  activity: IndependentActivityView | null;
}) {
  const router = useRouter();
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDone() {
    router.refresh();
  }

  async function handleStop() {
    setError(null);
    setStopping(true);
    try {
      await stopIndependentActivity();
      handleDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setStopping(false);
    }
  }

  if (!employment) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <IndependentActivityInfoTip />
          <span>Indépendant complémentaire</span>
        </h2>
        <p className={styles.jobMeta}>
          Ce statut suppose un emploi principal actif — trouve d'abord un job pour pouvoir déclarer une activité
          annexe.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <IndependentActivityInfoTip />
        <span>Indépendant complémentaire</span>
      </h2>
      <p className={styles.jobMeta}>
        Revenu annexe en plus de ton emploi, sans forfait minimum trimestriel (contrairement à un indépendant à
        titre principal) — mais agrégé à ton salaire pour l'impôt : il est taxé à ta tranche marginale, pas à un
        taux à part.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {activity ? (
        <div className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>Activité en cours</div>
            <div className={styles.jobMeta}>Démarrée au cycle n°{activity.startedCycle}</div>
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>
              {currencyFormatter.format(activity.grossRevenuePerCycle)}
              <span className={styles.jobMeta}> / cycle brut</span>
            </div>
            <button className={styles.logout} type="button" disabled={stopping} onClick={handleStop}>
              {stopping ? "…" : "Arrêter l'activité"}
            </button>
          </div>
        </div>
      ) : (
        <StartActivityForm onDone={handleDone} />
      )}
    </section>
  );
}

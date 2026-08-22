"use client";

import { useState, type FormEvent } from "react";
import { MAX_NEW_SHARE_PERCENTAGE, MIN_CAPITAL_RAISE_AMOUNT, MIN_NEW_SHARE_PERCENTAGE } from "@patrimoine-jeu/domain";
import type { CapitalRaiseView, CompanyDetail as CompanyDetailData } from "../../../lib/session";
import { GameError, cancelCapitalRaise, createCapitalRaise } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function ActiveRaiseCard({ raise, onDone }: { raise: CapitalRaiseView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelCapitalRaise(raise.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{currencyFormatter.format(raise.targetAmount)} recherchés</div>
        <div className={styles.jobStats}>
          <span>🧩 {raise.newSharePercentage}% de nouvelles parts offertes</span>
          <span>⏳ {raise.cyclesRemaining} cycles restants</span>
          <span>
            💰 {currencyFormatter.format(raise.amountRaised)} déjà reçus (
            {currencyFormatter.format(raise.remainingAmount)} restants)
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
          {pending ? "…" : "🚫 Retirer"}
        </button>
      </div>
    </div>
  );
}

function CreateRaiseForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [targetAmount, setTargetAmount] = useState(MIN_CAPITAL_RAISE_AMOUNT);
  const [newSharePercentage, setNewSharePercentage] = useState(10);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createCapitalRaise(companyId, targetAmount, newSharePercentage);
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
        min={MIN_CAPITAL_RAISE_AMOUNT}
        step={100}
        value={targetAmount}
        onChange={(e) => setTargetAmount(Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        min={MIN_NEW_SHARE_PERCENTAGE}
        max={MAX_NEW_SHARE_PERCENTAGE}
        step={1}
        value={newSharePercentage}
        onChange={(e) => setNewSharePercentage(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "💰 Ouvrir une levée de fonds"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function CapitalRaiseSection({
  company,
  raise,
  onDone,
}: {
  company: CompanyDetailData;
  raise: CapitalRaiseView | null;
  onDone: () => void;
}) {
  if (!company.isPrimaryOwner) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="💰"
          title="Capital-risque"
          mechanic="Tu lèves des fonds auprès d'un autre joueur en échange de NOUVELLES parts émises — l'argent va dans la trésorerie de l'entreprise, pas dans ta poche, et dilue tous les actionnaires actuels (toi y compris) au prorata de leurs parts existantes."
          realWorld="C'est un tour de financement en capital-risque classique : l'entreprise obtient du cash frais pour grandir, mais chaque part existante représente mécaniquement une plus petite fraction de l'entreprise après l'émission — le vrai prix à payer pour lever des fonds sans emprunter."
        />
        <span>Capital-risque</span>
      </h2>
      <p className={styles.jobMeta}>
        Lève des fonds auprès d'un autre joueur en échange de NOUVELLES parts — l'argent va dans la trésorerie de
        l'entreprise, pas dans ta poche, et dilue tous les actionnaires actuels (toi y compris) au prorata.
      </p>

      {raise ? (
        <ActiveRaiseCard raise={raise} onDone={onDone} />
      ) : (
        <CreateRaiseForm companyId={company.id} onDone={onDone} />
      )}
    </section>
  );
}

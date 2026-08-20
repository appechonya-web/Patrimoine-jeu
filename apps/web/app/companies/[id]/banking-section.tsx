"use client";

import { useState, type FormEvent } from "react";
import { MAX_DEPOSIT_RATE, MIN_DEPOSIT_AMOUNT, MIN_DEPOSIT_RATE, SOLVENCY_RATIO_CAP } from "@patrimoine-jeu/domain";
import type { BankReliabilityView, CompanyDetail } from "../../../lib/session";
import { GameError, depositAtBank, setDepositRate } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function reliabilityLabel(reliability: number): string {
  if (reliability >= 70) return "🟢 Fiable";
  if (reliability >= 30) return "🟡 Prudence";
  return "🔴 Risqué";
}

function RateForm({ company, onDone }: { company: CompanyDetail; onDone: () => void }) {
  const [rate, setRate] = useState(company.depositRate * 100);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setDepositRate(company.id, rate / 100);
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
        min={MIN_DEPOSIT_RATE * 100}
        max={MAX_DEPOSIT_RATE * 100}
        step={0.1}
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "Fixer le taux (%/an)"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function DepositForm({ company, onDone }: { company: CompanyDetail; onDone: () => void }) {
  const [amount, setAmount] = useState(MIN_DEPOSIT_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await depositAtBank(company.id, amount);
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
        min={MIN_DEPOSIT_AMOUNT}
        step={10}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "Déposer"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function BankingSection({
  company,
  bankReliability,
  onDone,
}: {
  company: CompanyDetail;
  bankReliability: BankReliabilityView | null;
  onDone: () => void;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🏦"
          title="Banque"
          mechanic={`N'importe quelle entreprise peut accepter des dépôts d'un joueur — ils alimentent directement sa trésorerie, augmentant sa capacité de prêt réelle, mais un vrai ratio de solvabilité plafonne l'encours total prêté à ${SOLVENCY_RATIO_CAP}× ses fonds propres, pas seulement sa trésorerie disponible.`}
          realWorld="C'est une version simplifiée de la réglementation bancaire réelle (type Bâle III) : une banque ne peut pas prêter indéfiniment à partir des dépôts qu'elle reçoit, elle doit garder un coussin de fonds propres proportionnel à son risque de prêt — une banque sous-capitalisée qui prête trop peut faire faillite si une vague de défauts survient."
          tip="Avant de déposer chez une entreprise-banque, regarde sa cote de fiabilité ci-dessous — en dessous de 30/100, elle est déjà proche de son plafond de solvabilité et risque plus de faire faillite."
        />
        <span>Banque</span>
      </h2>
      <p className={styles.jobMeta}>
        N'importe quel joueur peut déposer ici — les dépôts alimentent directement la trésorerie de l'entreprise,
        augmentant d'autant sa capacité de prêt réelle. Un retrait est plafonné par ce qu'il reste réellement en
        caisse : si l'entreprise a trop prêté, il peut échouer ou être partiel — le vrai risque de liquidité
        bancaire. Au-delà de la liquidité immédiate, un vrai ratio de solvabilité limite l'encours total prêté par
        rapport aux fonds propres — une banque qui en approche le plafond devient plus risquée pour ses déposants.
      </p>
      <div className={styles.jobStats}>
        <span>📈 Taux offert {(company.depositRate * 100).toFixed(1)}%/an</span>
        <span>💰 Dépôts cumulés {currencyFormatter.format(company.totalDeposits)}</span>
        <span>🏦 Trésorerie disponible {currencyFormatter.format(company.cashReserve)}</span>
        {bankReliability && (
          <>
            <span>{reliabilityLabel(bankReliability.reliability)} ({bankReliability.reliability.toFixed(0)}/100)</span>
            <span>
              🎯 Plafond de prêt {currencyFormatter.format(bankReliability.solvencyCap)} (encours{" "}
              {currencyFormatter.format(bankReliability.outstandingLoans)})
            </span>
          </>
        )}
      </div>
      {company.isPrimaryOwner && <RateForm company={company} onDone={onDone} />}
      <DepositForm company={company} onDone={onDone} />
    </section>
  );
}

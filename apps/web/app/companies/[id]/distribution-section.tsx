"use client";

import { useState, type FormEvent } from "react";
import {
  DIVIDEND_WITHHOLDING_RATE,
  INVESTMENT_AXES,
  INVESTMENT_AXIS_LABELS,
  LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE,
  LIQUIDATION_RESERVE_ENTRY_TAX_RATE,
  MAX_INVESTMENT_PER_CYCLE,
  MIN_INVESTMENT_AMOUNT,
  type InvestmentAxis,
} from "@patrimoine-jeu/domain";
import type { CompanyDetail } from "../../../lib/session";
import { GameError, setAutoReinvestRule, setDistributionPolicy, withdrawLiquidationReserve } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function PolicyButton({
  company,
  policy,
  label,
  description,
  onDone,
}: {
  company: CompanyDetail;
  policy: "dividend" | "reserve";
  label: string;
  description: string;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = company.distributionPolicy === policy;

  async function handleClick() {
    if (isActive) return;
    setError(null);
    setPending(true);
    try {
      await setDistributionPolicy(company.id, policy);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${styles.jobCard} ${isActive ? styles.jobCardMe : ""}`}>
      <div>
        <div className={styles.jobTitle}>
          {isActive && "✅ "}
          {label}
        </div>
        <div className={styles.jobMeta}>{description}</div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={isActive ? styles.logout : styles.apply} type="button" disabled={pending || isActive} onClick={handleClick}>
          {pending ? "…" : isActive ? "Politique active" : "Choisir"}
        </button>
      </div>
    </div>
  );
}

function WithdrawReserveForm({ company, onDone }: { company: CompanyDetail; onDone: () => void }) {
  const [amount, setAmount] = useState(Math.round(company.liquidationReserve));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await withdrawLiquidationReserve(company.id, amount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const taxRate = company.liquidationReserveIsMature ? 0 : LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE;

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={1}
        max={company.liquidationReserve}
        step={10}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending || company.liquidationReserve <= 0}>
        {pending ? "…" : `🏦 Retirer (${taxRate === 0 ? "0% de taxe" : `-${(taxRate * 100).toFixed(0)}%`})`}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function AutoReinvestForm({ company, onDone }: { company: CompanyDetail; onDone: () => void }) {
  const [axis, setAxis] = useState<InvestmentAxis | "">(company.autoReinvestAxis as InvestmentAxis | "" ?? "");
  const [capPerCycle, setCapPerCycle] = useState(company.autoReinvestCapPerCycle ?? MIN_INVESTMENT_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await setAutoReinvestRule(company.id, axis === "" ? null : axis, capPerCycle);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h3 className={styles.jobMeta}>🔁 Réinvestissement automatique du profit</h3>
      <p className={styles.jobMeta}>
        Chaque cycle, jusqu'au plafond choisi du profit POSITIF est automatiquement investi dans ce levier avant la
        distribution — le reliquat suit la politique ci-dessus normalement.
      </p>
      <form noValidate className={styles.form} onSubmit={handleSubmit}>
        <select className={styles.formInput} value={axis} onChange={(e) => setAxis(e.target.value as InvestmentAxis | "")}>
          <option value="">Désactivé</option>
          {INVESTMENT_AXES.map((a) => (
            <option key={a} value={a}>
              {INVESTMENT_AXIS_LABELS[a]}
            </option>
          ))}
        </select>
        <input
          className={styles.formInput}
          type="number"
          min={MIN_INVESTMENT_AMOUNT}
          max={MAX_INVESTMENT_PER_CYCLE}
          step={50}
          disabled={axis === ""}
          value={capPerCycle}
          onChange={(e) => setCapPerCycle(Number(e.target.value))}
        />
        <button className={styles.apply} type="submit" disabled={pending}>
          {pending ? "…" : "💾 Enregistrer"}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </form>
    </>
  );
}

export function DistributionSection({ company, onDone }: { company: CompanyDetail; onDone: () => void }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="💰"
          title="Distribution des bénéfices"
          mechanic={`Deux politiques : distribuer le profit net en dividende immédiat (taxé ${(DIVIDEND_WITHHOLDING_RATE * 100).toFixed(0)}% au précompte mobilier) chaque cycle, ou l'accumuler dans une réserve de liquidation (taxée seulement ${(LIQUIDATION_RESERVE_ENTRY_TAX_RATE * 100).toFixed(0)}% à l'entrée, mais gelée — un retrait avant maturité coûte ${(LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE * 100).toFixed(0)}% de taxe en plus).`}
          realWorld="La réserve de liquidation est un vrai dispositif fiscal belge pour les PME : elle permet à un dirigeant de sortir l'argent de sa société avec une charge fiscale totale d'environ 13% (10% + 20% sur ce qui reste) au lieu de 30% immédiat, à condition d'être patient — exactement le compromis liquidité contre fiscalité que gèrent les vrais comptables d'entreprise."
          tip="Sous la politique dividende, 100% du profit part aux actionnaires chaque cycle — active le réinvestissement automatique ci-dessous si tu veux que la trésorerie de l'entreprise grossisse plutôt que ta poche personnelle."
        />
        <span>Distribution des bénéfices</span>
      </h2>
      <p className={styles.jobMeta}>
        Le levier fiscal classique d'un dirigeant de PME belge : sortir l'argent de la société en payant le moins
        d'impôt possible, légalement. Un dividende immédiat est taxé à {(DIVIDEND_WITHHOLDING_RATE * 100).toFixed(0)}%
        (précompte mobilier) ; une réserve de liquidation ne coûte que {(LIQUIDATION_RESERVE_ENTRY_TAX_RATE * 100).toFixed(0)}% à la
        constitution, et devient totalement gratuite si tu la laisses dormir ~1 an avant de la retirer.
      </p>

      {company.isPrimaryOwner ? (
        <>
          <div className={styles.jobList}>
            <PolicyButton
              company={company}
              policy="dividend"
              label="💵 Dividende immédiat"
              description={`Le profit net est versé aux actionnaires chaque cycle, taxé à ${(DIVIDEND_WITHHOLDING_RATE * 100).toFixed(0)}%.`}
              onDone={onDone}
            />
            <PolicyButton
              company={company}
              policy="reserve"
              label="🏦 Réserve de liquidation"
              description={`Le profit reste dans l'entreprise, taxé ${(LIQUIDATION_RESERVE_ENTRY_TAX_RATE * 100).toFixed(0)}% à l'entrée — gratuit à la sortie après ~1 an, ${(LIQUIDATION_RESERVE_EARLY_WITHDRAWAL_TAX_RATE * 100).toFixed(0)}% de taxe en plus si retiré avant.`}
              onDone={onDone}
            />
          </div>

          <div className={styles.jobStats}>
            <span>💰 Réserve {currencyFormatter.format(company.liquidationReserve)}</span>
            {company.liquidationReserve > 0 && (
              <span>
                {company.liquidationReserveIsMature
                  ? "✅ Retrait gratuit disponible"
                  : `🔒 Gratuite à partir du cycle n°${company.liquidationReserveMatureAtCycle}`}
              </span>
            )}
          </div>
          {company.liquidationReserve > 0 && <WithdrawReserveForm company={company} onDone={onDone} />}

          <AutoReinvestForm company={company} onDone={onDone} />
        </>
      ) : (
        <p className={styles.jobMeta}>Seul l'actionnaire principal pilote la politique de distribution.</p>
      )}
    </section>
  );
}

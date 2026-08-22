"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  COMPTE_TERME_TERM_OPTIONS_CYCLES,
  MIN_SAVINGS_DEPOSIT,
  SAVINGS_PRODUCT_DESCRIPTIONS,
  SAVINGS_PRODUCT_LABELS,
  SAVINGS_PRODUCT_TYPES,
  type CompteTermeCycles,
  type SavingsProductType,
} from "@patrimoine-jeu/domain";
import type { PensionSavingsStatus, SavingsAccountView } from "../../lib/session";
import { GameError, depositSavings, openSavingsAccount, withdrawSavings } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

function yearsLabel(cycles: number): string {
  const years = cycles / 365;
  return `${years} an${years > 1 ? "s" : ""}`;
}

function OpenAccountForm({
  onDone,
  pensionStatus,
}: {
  onDone: () => void;
  pensionStatus: PensionSavingsStatus | null;
}) {
  const [productType, setProductType] = useState<SavingsProductType>("livret");
  const [amount, setAmount] = useState(100);
  const [termCycles, setTermCycles] = useState<CompteTermeCycles>(COMPTE_TERME_TERM_OPTIONS_CYCLES[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReduction, setLastReduction] = useState<number | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await openSavingsAccount(
        productType,
        amount,
        productType === "compte-terme" ? termCycles : undefined,
      );
      setLastReduction(result.taxReduction > 0 ? result.taxReduction : null);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const projectedReduction =
    productType === "pension" && pensionStatus
      ? Math.min(amount, pensionStatus.remainingCap) * pensionStatus.taxReductionRate
      : 0;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <select
        className={styles.formInput}
        value={productType}
        onChange={(e) => setProductType(e.target.value as SavingsProductType)}
      >
        {SAVINGS_PRODUCT_TYPES.map((type) => (
          <option key={type} value={type}>
            {SAVINGS_PRODUCT_LABELS[type]}
          </option>
        ))}
      </select>
      {productType === "compte-terme" && (
        <select
          className={styles.formInput}
          value={termCycles}
          onChange={(e) => setTermCycles(Number(e.target.value) as CompteTermeCycles)}
        >
          {COMPTE_TERME_TERM_OPTIONS_CYCLES.map((cycles) => (
            <option key={cycles} value={cycles}>
              {yearsLabel(cycles)}
            </option>
          ))}
        </select>
      )}
      <input
        className={styles.formInput}
        type="number"
        min={MIN_SAVINGS_DEPOSIT}
        step={10}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      {productType === "pension" && pensionStatus && (
        <p className={styles.jobMeta}>
          Plafond déductible restant cette année : {currencyFormatter.format(pensionStatus.remainingCap)} sur{" "}
          {currencyFormatter.format(pensionStatus.annualCap)}
          {projectedReduction > 0 &&
            ` — réduction d'impôt immédiate estimée : ${currencyFormatter.format(projectedReduction)}`}
        </p>
      )}
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🐷 Ouvrir ce compte"}
      </button>
      {lastReduction !== null && (
        <p className={styles.jobMeta}>
          ✅ Réduction d'impôt reçue immédiatement : {currencyFormatter.format(lastReduction)}
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function AccountCard({ account, onDone }: { account: SavingsAccountView; onDone: () => void }) {
  const [partialAmount, setPartialAmount] = useState(account.balance);
  const [depositAmount, setDepositAmount] = useState(MIN_SAVINGS_DEPOSIT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleWithdraw(amount?: number) {
    setError(null);
    setPending(true);
    try {
      await withdrawSavings(account.id, amount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleDeposit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await depositSavings(account.id, depositAmount);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const isLivret = account.productType === "livret";

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{SAVINGS_PRODUCT_LABELS[account.productType as SavingsProductType]}</div>
        <div className={styles.jobMeta}>{SAVINGS_PRODUCT_DESCRIPTIONS[account.productType as SavingsProductType]}</div>
        <div className={styles.jobStats}>
          <span>📈 Taux {(account.rate * 100).toFixed(1)}%/an</span>
          <span>💰 Déposé {currencyFormatter.format(account.principal)}</span>
          {account.maturityCycle !== null && (
            <span>{account.isMature ? "✅ Débloqué" : `🔒 Débloqué au cycle n°${account.maturityCycle}`}</span>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(account.balance)}</div>
        {isLivret ? (
          <>
            <form className={styles.form} onSubmit={handleDeposit}>
              <input
                className={styles.formInput}
                type="number"
                min={MIN_SAVINGS_DEPOSIT}
                step={10}
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
              />
              <button className={styles.apply} type="submit" disabled={pending}>
                {pending ? "…" : "➕ Ajouter"}
              </button>
            </form>
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                handleWithdraw(partialAmount);
              }}
            >
              <input
                className={styles.formInput}
                type="number"
                min={0.01}
                max={account.balance}
                step={10}
                value={partialAmount}
                onChange={(e) => setPartialAmount(Number(e.target.value))}
              />
              <button className={styles.logout} type="submit" disabled={pending}>
                {pending ? "…" : "💵 Retirer"}
              </button>
            </form>
          </>
        ) : (
          <button className={styles.logout} type="button" disabled={pending} onClick={() => handleWithdraw()}>
            {pending
              ? "…"
              : account.isMature
                ? "💰 Retirer le solde"
                : "⚠️ Retrait anticipé (perte des intérêts)"}
          </button>
        )}
      </div>
    </div>
  );
}

export function SavingsList({
  accounts,
  pensionStatus,
}: {
  accounts: SavingsAccountView[];
  pensionStatus: PensionSavingsStatus | null;
}) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🐷"
            title="Mes comptes"
            mechanic="Trois produits, un vrai arbitrage liquidité/rendement : le livret se retire (et s'alimente) à tout moment mais rapporte peu, le compte à terme bloque l'argent pour un taux plus élevé (retrait anticipé = perte des intérêts courus) et n'accepte qu'un seul versement à l'ouverture, l'épargne-pension rapporte le plus et est exonérée d'impôt mais bloquée le plus longtemps avec une vraie pénalité de sortie anticipée."
            realWorld="C'est exactement l'arbitrage réel entre un livret d'épargne, un compte à terme et une épargne-pension belge : plus tu acceptes de bloquer ton argent, plus le rendement est élevé — la pension bénéficiant en plus d'un vrai avantage fiscal à l'entrée."
          />
          <span>Mes comptes</span>
        </h2>
        {accounts.length === 0 ? (
          <p className={styles.jobMeta}>Aucun compte d'épargne pour l'instant.</p>
        ) : (
          <div className={styles.jobList}>
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} onDone={handleDone} />
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>➕ Ouvrir un compte</h2>
        <OpenAccountForm onDone={handleDone} pensionStatus={pensionStatus} />
      </section>
    </>
  );
}

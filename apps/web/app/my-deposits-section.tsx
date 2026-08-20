"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DepositView } from "../lib/session";
import { GameError, withdrawDeposit } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function DepositCard({ deposit, onDone }: { deposit: DepositView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleWithdraw() {
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await withdrawDeposit(deposit.id);
      if (result.partial) {
        setNotice(
          `Retrait partiel : ${currencyFormatter.format(result.withdrawn)} — la banque n'avait pas assez de trésorerie disponible pour le reste.`,
        );
      }
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
        <div className={styles.jobTitle}>
          <Link href={`/companies/${deposit.companyId}`}>{deposit.companyName}</Link>
          {!deposit.companyActive && " 💥 (faillite — dépôt perdu)"}
        </div>
        <div className={styles.jobMeta}>Taux verrouillé {(deposit.rate * 100).toFixed(1)}%/an</div>
        {notice && <p className={styles.jobMeta}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(deposit.balance)}</div>
        <button
          className={styles.logout}
          type="button"
          disabled={pending || !deposit.companyActive}
          onClick={handleWithdraw}
        >
          {pending ? "…" : "Retirer"}
        </button>
      </div>
    </div>
  );
}

export function MyDepositsSection({ deposits }: { deposits: DepositView[] }) {
  const router = useRouter();

  if (deposits.length === 0) return null;

  function handleDone() {
    router.refresh();
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🏦"
          title="Mes dépôts bancaires"
          mechanic="Ton taux est verrouillé au moment du dépôt, même si l'entreprise en change ensuite. Un retrait peut être partiel si la banque n'a pas assez de trésorerie disponible — et si l'entreprise fait faillite, ton dépôt est remboursé au prorata de ce qu'il reste en caisse, jamais garanti à 100%."
          realWorld="C'est le vrai risque d'un dépôt bancaire hors garantie d'État : en Belgique, les dépôts sont normalement protégés jusqu'à 100 000€ par le Fonds de garantie — ici, aucune garantie de ce type n'existe, le risque de perte en cas de faillite de la banque-joueur est réel et à ta charge."
          tip="Avant de déposer une grosse somme, vérifie la cote de fiabilité de l'entreprise sur sa page — en dessous de 30/100, le risque de perte partielle en cas de faillite n'est pas négligeable."
        />
        <span>Mes dépôts bancaires</span>
      </h2>
      <div className={styles.jobList}>
        {deposits.map((deposit) => (
          <DepositCard key={deposit.id} deposit={deposit} onDone={handleDone} />
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LoanOfferView } from "../../lib/session";
import { GameError, takeLoanOffer } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function reliabilityLabel(reliability: number): string {
  if (reliability >= 70) return "🟢 Fiable";
  if (reliability >= 30) return "🟡 Prudence";
  return "🔴 Risqué";
}

function OfferCard({ offer }: { offer: LoanOfferView }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTake() {
    setError(null);
    setPending(true);
    try {
      await takeLoanOffer(offer.id);
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
        <div className={styles.jobTitle}>{currencyFormatter.format(offer.principal)}</div>
        <div className={styles.jobMeta}>
          Prêté par{" "}
          <Link href={`/companies/${offer.lenderCompany.id}`}>{offer.lenderCompany.name}</Link> —{" "}
          {offer.lenderCompany.sector} — {offer.lenderCompany.municipality}
        </div>
        <div className={styles.jobStats}>
          <span>📈 Taux {(offer.rate * 100).toFixed(1)}%/an</span>
          <span>⏳ Durée {offer.termCycles} cycles</span>
          <span>{reliabilityLabel(offer.lenderCompany.reliability)}</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleTake}>
          {pending ? "…" : "🏦 Emprunter"}
        </button>
      </div>
    </div>
  );
}

export function LoanOfferList({ offers }: { offers: LoanOfferView[] }) {
  if (offers.length === 0) {
    return <p className={styles.jobMeta}>Aucune offre de prêt pour l'instant.</p>;
  }

  return (
    <div className={styles.jobList}>
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

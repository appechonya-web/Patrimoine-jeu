"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LoanOfferView } from "../../lib/session";
import { GameError, takeLoanOffer } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { StatHint } from "../stat-hint";
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
          <span>
            <StatHint hint="Fixé librement par l'entreprise prêteuse — ne bouge plus une fois le prêt accepté, même si sa situation financière change ensuite.">
              📈 Taux {(offer.rate * 100).toFixed(1)}%/an
            </StatHint>
          </span>
          <span>
            <StatHint hint="Nombre de cycles sur lesquels tu rembourseras ce prêt, capital et intérêts inclus à chaque échéance.">
              ⏳ Durée {offer.termCycles} cycles
            </StatHint>
          </span>
          <span>
            <StatHint hint="Solvabilité de l'entreprise prêteuse — en dessous de 30/100, elle est déjà proche de son plafond de prêt et plus susceptible de rencontrer des difficultés, même si ça n'affecte pas directement ton propre remboursement.">
              {reliabilityLabel(offer.lenderCompany.reliability)}
            </StatHint>
          </span>
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

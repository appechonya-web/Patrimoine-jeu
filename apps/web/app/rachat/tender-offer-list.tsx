"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TenderOfferView } from "../../lib/session";
import { GameError, cancelTenderOffer, tenderShares } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function OfferCard({ offer, myPseudo }: { offer: TenderOfferView; myPseudo: string }) {
  const router = useRouter();
  const [percentage, setPercentage] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMine = offer.acquirerPseudo === myPseudo;

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelTenderOffer(offer.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  async function handleTender(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await tenderShares(offer.id, percentage);
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
          <Link href={`/companies/${offer.companyId}`}>{offer.companyName}</Link>
        </div>
        <div className={styles.jobMeta}>
          {offer.sector} — {offer.municipality} — acquéreur : {offer.acquirerPseudo}
        </div>
        <div className={styles.jobStats}>
          <span>⏳ {offer.cyclesRemaining} cycles restants</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(offer.pricePerPercent)} / 1%</div>
        {isMine ? (
          <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
            {pending ? "…" : "🚫 Retirer"}
          </button>
        ) : (
          <form className={styles.form} onSubmit={handleTender}>
            <input
              className={styles.formInput}
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
            />
            <button className={styles.apply} type="submit" disabled={pending}>
              {pending ? "…" : "🤝 Céder mes parts"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function TenderOfferList({ offers, myPseudo }: { offers: TenderOfferView[]; myPseudo: string }) {
  if (offers.length === 0) {
    return <p className={styles.jobMeta}>Aucune OPA en cours pour l'instant. 🕊️</p>;
  }

  return (
    <div className={styles.jobList}>
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} myPseudo={myPseudo} />
      ))}
    </div>
  );
}

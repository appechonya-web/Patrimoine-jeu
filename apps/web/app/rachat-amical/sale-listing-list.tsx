"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { SaleListingView } from "../../lib/session";
import { GameError, submitSaleBid } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

function ListingCard({ listing }: { listing: SaleListingView }) {
  const [pricePerPercent, setPricePerPercent] = useState(listing.askingPricePerPercent ?? 1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await submitSaleBid(listing.id, pricePerPercent);
      setSent(true);
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
          <Link href={`/companies/${listing.companyId}`}>{listing.companyName}</Link>
        </div>
        <div className={styles.jobMeta}>
          {listing.sector} — {listing.municipality}
        </div>
        <div className={styles.jobStats}>
          <span>🧩 {listing.sharePercentage}% des parts</span>
          {listing.askingPricePerPercent !== null && (
            <span>💬 Prix indicatif {currencyFormatter.format(listing.askingPricePerPercent)}/1%</span>
          )}
          <span>📨 {listing.bidCount} offre(s) reçue(s)</span>
          <span>⏳ {listing.cyclesRemaining} cycles restants</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {sent && <p className={styles.jobMeta}>Offre envoyée — le vendeur décide en privé.</p>}
      </div>
      <div className={styles.jobActions}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.formInput}
            type="number"
            min={0.01}
            step={1}
            value={pricePerPercent}
            onChange={(e) => setPricePerPercent(Number(e.target.value))}
          />
          <button className={styles.apply} type="submit" disabled={pending}>
            {pending ? "…" : sent ? "🔁 Réviser mon offre" : "🤝 Faire une offre"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function SaleListingList({ listings }: { listings: SaleListingView[] }) {
  if (listings.length === 0) {
    return <p className={styles.jobMeta}>Aucune annonce de vente pour l'instant. 🕊️</p>;
  }

  return (
    <div className={styles.jobList}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

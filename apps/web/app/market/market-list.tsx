"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketListing } from "../../lib/session";
import { GameError, buyShareListing } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

function ListingCard({ listing }: { listing: MarketListing }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);
    setPending(true);
    try {
      await buyShareListing(listing.id);
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
          <Link href={`/companies/${listing.company.id}`}>{listing.company.name}</Link>
        </div>
        <div className={styles.jobMeta}>
          {listing.company.sector} — {listing.company.municipality} — vendeur : {listing.sellerPseudo}
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Part du capital de l'entreprise que cet achat te donnerait — proportionnelle à ta part des futurs dividendes et de ton poids dans les votes d'actionnaires.">
              🧩 {listing.sharePercentage}% des parts
            </StatHint>
          </span>
          <span>
            <StatHint hint="Force commerciale de l'entreprise face à ses concurrents du même marché — plus haut capte une plus grande part de la demande disponible. Ouvre sa fiche pour le détail.">
              ⭐ Attractivité {listing.company.attractivenessScore.toFixed(0)}/100
            </StatHint>
          </span>
          {listing.company.latestNetProfitPerCycle !== null && (
            <span>
              <StatHint hint="Profit net de l'entreprise au dernier cycle clôturé — un signal de rentabilité, mais un seul cycle ne dit pas tout : regarde sa fiche pour le profit cumulé depuis sa fondation.">
                💰 Profit {currencyFormatter.format(listing.company.latestNetProfitPerCycle)}/cycle
              </StatHint>
            </span>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(listing.price)}</div>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleBuy}>
          {pending ? "…" : "🛒 Acheter"}
        </button>
      </div>
    </div>
  );
}

export function MarketList({ listings }: { listings: MarketListing[] }) {
  if (listings.length === 0) {
    return <p className={styles.jobMeta}>Aucune offre de parts en vente pour l'instant. 🕊️</p>;
  }

  return (
    <div className={styles.jobList}>
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}

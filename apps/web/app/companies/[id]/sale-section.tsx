"use client";

import { useState, type FormEvent } from "react";
import type { CompanyDetail as CompanyDetailData, SaleBidView, SaleListingView } from "../../../lib/session";
import { GameError, acceptSaleBid, cancelSaleListing, createSaleListing } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function BidRow({ bid, onDone }: { bid: SaleBidView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setPending(true);
    try {
      await acceptSaleBid(bid.id);
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
        <div className={styles.jobTitle}>{bid.buyerPseudo}</div>
        <div className={styles.jobStats}>
          <span>💬 {currencyFormatter.format(bid.pricePerPercent)}/1%</span>
          <span>💰 {currencyFormatter.format(bid.totalPrice)} au total</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleAccept}>
          {pending ? "…" : "✅ Accepter"}
        </button>
      </div>
    </div>
  );
}

function CreateListingForm({ companyId, maxPercentage, onDone }: { companyId: string; maxPercentage: number; onDone: () => void }) {
  const [sharePercentage, setSharePercentage] = useState(Math.min(100, maxPercentage));
  const [askingPricePerPercent, setAskingPricePerPercent] = useState<number | "">("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createSaleListing(companyId, sharePercentage, askingPricePerPercent === "" ? undefined : askingPricePerPercent);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (maxPercentage <= 0) {
    return <p className={styles.jobMeta}>Tu ne possèdes aucune part à vendre.</p>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={0.01}
        max={maxPercentage}
        step={1}
        value={sharePercentage}
        onChange={(e) => setSharePercentage(Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        min={0}
        step={1}
        placeholder="Prix indicatif (facultatif)"
        value={askingPricePerPercent}
        onChange={(e) => setAskingPricePerPercent(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🤝 Publier l'annonce"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function SaleSection({
  company,
  listing,
  bids,
  onDone,
}: {
  company: CompanyDetailData;
  listing: SaleListingView | null;
  bids: SaleBidView[];
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!company.isPrimaryOwner) return null;

  async function handleCancel() {
    if (!listing) return;
    setError(null);
    setPending(true);
    try {
      await cancelSaleListing(listing.id);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🤝"
          title="Rachat amical"
          mechanic="Négociation privée : tu publies une annonce de vente, les acheteurs intéressés proposent chacun leur prix (visible de toi seul), et tu choisis librement laquelle accepter — aucune prime minimale imposée, contrairement à l'OPA hostile."
          realWorld="C'est une vente de gré à gré (M&A négocié) telle qu'elle se pratique pour la majorité des rachats d'entreprises non cotées : contrairement à une OPA publique, le vendeur garde le contrôle total du processus et peut refuser toute offre qui ne lui convient pas."
        />
        <span>Rachat amical</span>
      </h2>
      <p className={styles.jobMeta}>
        Négociation privée : publie une annonce, les acheteurs intéressés proposent chacun leur prix (visible de toi
        seul), tu choisis librement laquelle accepter — pas de prime minimale imposée, contrairement à l'OPA hostile.
      </p>

      {listing ? (
        <>
          <div className={styles.jobCard}>
            <div>
              <div className={styles.jobTitle}>{listing.sharePercentage}% en vente</div>
              <div className={styles.jobStats}>
                <span>⏳ {listing.cyclesRemaining} cycles restants</span>
                <span>📨 {bids.length} offre(s) reçue(s)</span>
              </div>
              {error && <p className={styles.error}>{error}</p>}
            </div>
            <div className={styles.jobActions}>
              <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
                {pending ? "…" : "🚫 Retirer l'annonce"}
              </button>
            </div>
          </div>

          {bids.length > 0 && (
            <div className={styles.jobList}>
              {bids.map((bid) => (
                <BidRow key={bid.id} bid={bid} onDone={onDone} />
              ))}
            </div>
          )}
        </>
      ) : (
        <CreateListingForm companyId={company.id} maxPercentage={company.sharePercentage} onDone={onDone} />
      )}
    </section>
  );
}

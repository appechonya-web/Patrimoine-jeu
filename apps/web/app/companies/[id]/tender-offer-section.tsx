"use client";

import { useState, type FormEvent } from "react";
import { MIN_TENDER_PREMIUM_RATIO } from "@patrimoine-jeu/domain";
import type { CompanyDetail as CompanyDetailData, TenderOfferView } from "../../../lib/session";
import { GameError, cancelTenderOffer, launchTenderOffer, tenderShares } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function OfferRow({
  offer,
  myPseudo,
  mySharePercentage,
  onDone,
}: {
  offer: TenderOfferView;
  myPseudo: string;
  mySharePercentage: number;
  onDone: () => void;
}) {
  const [percentage, setPercentage] = useState(Math.min(1, mySharePercentage));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMine = offer.acquirerPseudo === myPseudo;

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelTenderOffer(offer.id);
      onDone();
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
        <div className={styles.jobTitle}>{currencyFormatter.format(offer.pricePerPercent)} / 1% de parts</div>
        <div className={styles.jobStats}>
          <span>⚔️ Acquéreur : {offer.acquirerPseudo}</span>
          <span>⏳ {offer.cyclesRemaining} cycles restants</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        {isMine ? (
          <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
            {pending ? "…" : "🚫 Retirer l'offre"}
          </button>
        ) : mySharePercentage > 0 ? (
          <form className={styles.form} onSubmit={handleTender}>
            <input
              className={styles.formInput}
              type="number"
              min={0.01}
              max={mySharePercentage}
              step={0.01}
              value={percentage}
              onChange={(e) => setPercentage(Number(e.target.value))}
            />
            <button className={styles.apply} type="submit" disabled={pending}>
              {pending ? "…" : "🤝 Céder mes parts"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function LaunchOfferForm({ companyId, minPrice, onDone }: { companyId: string; minPrice: number; onDone: () => void }) {
  const [pricePerPercent, setPricePerPercent] = useState(Math.ceil(minPrice));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await launchTenderOffer(companyId, pricePerPercent);
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
        min={minPrice}
        step={1}
        value={pricePerPercent}
        onChange={(e) => setPricePerPercent(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "⚔️ Lancer une OPA"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function TenderOfferSection({
  company,
  offers,
  myPseudo,
  onDone,
}: {
  company: CompanyDetailData;
  offers: TenderOfferView[];
  myPseudo: string;
  onDone: () => void;
}) {
  const minPrice = Math.max(0, (company.balanceSheet.equity / 100) * MIN_TENDER_PREMIUM_RATIO);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="⚔️"
          title="Rachat hostile (OPA)"
          mechanic={`N'importe quel joueur peut lancer une offre publique d'achat à un prix par 1% de parts, au moins ${((MIN_TENDER_PREMIUM_RATIO - 1) * 100).toFixed(0)}% au-dessus de la valeur comptable — ouverte à TOUS les actionnaires, pas seulement ceux qui voulaient vendre. Le contrôle change de mains dès que l'acquéreur dépasse les autres en parts détenues.`}
          realWorld="C'est un vrai rachat hostile (hostile takeover) tel qu'il existe sur les marchés boursiers réels : l'acquéreur s'adresse directement aux actionnaires plutôt qu'à la direction, et une prime au-dessus de la valeur comptable est nécessaire pour les convaincre de céder le contrôle malgré l'opposition possible des dirigeants en place."
        />
        <span>Rachat hostile (OPA)</span>
      </h2>
      <p className={styles.jobMeta}>
        N'importe quel joueur peut proposer un prix par 1% de parts, ouvert à tous les actionnaires actuels — pas
        seulement ceux qui souhaitaient vendre. Le contrôle change de mains dès que l'acquéreur dépasse les autres
        actionnaires en parts détenues.
      </p>

      {offers.length > 0 ? (
        <div className={styles.jobList}>
          {offers.map((offer) => (
            <OfferRow
              key={offer.id}
              offer={offer}
              myPseudo={myPseudo}
              mySharePercentage={company.sharePercentage}
              onDone={onDone}
            />
          ))}
        </div>
      ) : (
        <>
          <p className={styles.jobMeta}>
            Aucune offre en cours — prix minimum {currencyFormatter.format(minPrice)} par 1% (prime de{" "}
            {((MIN_TENDER_PREMIUM_RATIO - 1) * 100).toFixed(0)}% sur la valeur comptable).
          </p>
          <LaunchOfferForm companyId={company.id} minPrice={minPrice} onDone={onDone} />
        </>
      )}
    </section>
  );
}

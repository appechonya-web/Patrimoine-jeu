"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MIN_DONATION_AMOUNT, PLAYER_DONATION_GIFT_TAX_RATE } from "@patrimoine-jeu/domain";
import type { CauseDonationStatus, CauseView } from "../../lib/session";
import { GameError, donateToCause, donateToPlayer } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

function DonateToPlayerForm({ onDone }: { onDone: () => void }) {
  const [pseudo, setPseudo] = useState("");
  const [amount, setAmount] = useState(MIN_DONATION_AMOUNT * 2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await donateToPlayer(pseudo, amount);
      setNotice(
        `Envoyé : ${currencyFormatter.format(result.sent)} — ${currencyFormatter.format(result.tax)} de droits de donation, ${currencyFormatter.format(result.net)} reçus par ${pseudo}.`,
      );
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const projectedTax = amount * PLAYER_DONATION_GIFT_TAX_RATE;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="text"
        placeholder="Pseudo du destinataire"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        required
      />
      <input
        className={styles.formInput}
        type="number"
        min={MIN_DONATION_AMOUNT}
        step={5}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending || !pseudo}>
        {pending ? "…" : "Envoyer"}
      </button>
      <p className={styles.jobMeta}>
        Droits de donation : {(PLAYER_DONATION_GIFT_TAX_RATE * 100).toFixed(0)}% — soit{" "}
        {currencyFormatter.format(projectedTax)} sur ce montant, le destinataire recevra{" "}
        {currencyFormatter.format(amount - projectedTax)}.
      </p>
      {notice && <p className={styles.jobMeta}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function CauseCard({
  cause,
  status,
  onDone,
}: {
  cause: CauseView;
  status: CauseDonationStatus | null;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(MIN_DONATION_AMOUNT * 2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const result = await donateToCause(cause.id, amount);
      setNotice(
        result.taxReduction > 0
          ? `Merci ! ${currencyFormatter.format(result.taxReduction)} de réduction d'impôt immédiate — coût réel ${currencyFormatter.format(result.netCost)}.`
          : `Merci ! Plafond annuel déjà atteint, pas de réduction d'impôt sur ce don.`,
      );
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const projectedReduction = status ? Math.min(amount, status.remainingCap) * status.taxReductionRate : 0;

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{cause.name}</div>
        <div className={styles.jobMeta}>{cause.description}</div>
        {notice && <p className={styles.jobMeta}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.formInput}
            type="number"
            min={MIN_DONATION_AMOUNT}
            step={5}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <button className={styles.apply} type="submit" disabled={pending}>
            {pending ? "…" : "Donner"}
          </button>
        </form>
      </div>
      {status && (
        <p className={styles.jobMeta}>
          Plafond restant cette année : {currencyFormatter.format(status.remainingCap)} sur{" "}
          {currencyFormatter.format(status.annualCap)}
          {projectedReduction > 0 && ` — réduction estimée : ${currencyFormatter.format(projectedReduction)}`}
        </p>
      )}
    </div>
  );
}

export function DonationsList({
  causes,
  causeStatus,
}: {
  causes: CauseView[];
  causeStatus: CauseDonationStatus | null;
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
            label="👤"
            title="Don à un joueur"
            mechanic={`Un don entre joueurs est taxé à ${(PLAYER_DONATION_GIFT_TAX_RATE * 100).toFixed(0)}% — le destinataire reçoit le montant net de cette taxe, pas la totalité envoyée.`}
            realWorld="C'est l'équivalent des droits de donation belges entre personnes non apparentées, nettement plus élevés qu'entre membres d'une même famille — donner de l'argent à un tiers a un vrai coût fiscal, pas juste un virement gratuit."
          />
          <span>Don à un joueur</span>
        </h2>
        <DonateToPlayerForm onDone={handleDone} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏛️"
            title="Dons aux causes reconnues"
            mechanic="Contrairement au don entre joueurs, un don à une cause reconnue donne droit à une réduction d'impôt (pas une taxe) — plafonnée à un montant annuel."
            realWorld="C'est la vraie réduction d'impôt belge pour dons à des œuvres reconnues (45% du montant donné, plafonné) — un des rares cas où donner de l'argent te fait aussi économiser sur ta déclaration."
          />
          <span>Dons aux causes reconnues</span>
        </h2>
        <div className={styles.jobList}>
          {causes.map((cause) => (
            <CauseCard key={cause.id} cause={cause} status={causeStatus} onDone={handleDone} />
          ))}
        </div>
      </section>
    </>
  );
}

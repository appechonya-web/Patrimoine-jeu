"use client";

import { useState, type FormEvent } from "react";
import {
  MAX_COMMUNITY_LOAN_RATE,
  MAX_COMMUNITY_LOAN_TERM_CYCLES,
  MIN_COMMUNITY_LOAN_RATE,
  MIN_COMMUNITY_LOAN_TERM_CYCLES,
  MIN_LOAN_OFFER_PRINCIPAL,
} from "@patrimoine-jeu/domain";
import type { CompanyDetail as CompanyDetailData } from "../../../lib/session";
import { GameError, cancelLoanOffer, createLoanOffer } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function OfferRow({ offer, onDone }: { offer: CompanyDetailData["loanOffers"][number]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelLoanOffer(offer.id);
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
        <div className={styles.jobTitle}>{currencyFormatter.format(offer.principal)} proposés</div>
        <div className={styles.jobStats}>
          <span>📈 Taux {(offer.rate * 100).toFixed(1)}%/an</span>
          <span>⏳ Durée {offer.termCycles} cycles</span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
          {pending ? "…" : "🚫 Retirer"}
        </button>
      </div>
    </div>
  );
}

function ReceivableRow({ loan }: { loan: CompanyDetailData["loansAsLender"][number] }) {
  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>{currencyFormatter.format(loan.principal)} prêtés</div>
        <div className={styles.jobStats}>
          <span>📈 Taux {(loan.rate * 100).toFixed(1)}%/an</span>
          <span>⏳ Durée {loan.termCycles} cycles</span>
          <span>💳 Reste dû {currencyFormatter.format(loan.remainingBalance)}</span>
        </div>
      </div>
    </div>
  );
}

function CreateOfferForm({
  companyId,
  maxPrincipal,
  onDone,
}: {
  companyId: string;
  maxPrincipal: number;
  onDone: () => void;
}) {
  const [principal, setPrincipal] = useState(Math.min(MIN_LOAN_OFFER_PRINCIPAL, Math.max(0, maxPrincipal)));
  const [rate, setRate] = useState(MIN_COMMUNITY_LOAN_RATE);
  const [termCycles, setTermCycles] = useState(MIN_COMMUNITY_LOAN_TERM_CYCLES);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createLoanOffer(companyId, principal, rate, termCycles);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  if (maxPrincipal < MIN_LOAN_OFFER_PRINCIPAL) {
    return <p className={styles.jobMeta}>Trésorerie insuffisante pour proposer un prêt.</p>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={MIN_LOAN_OFFER_PRINCIPAL}
        max={maxPrincipal}
        step={50}
        value={principal}
        onChange={(e) => setPrincipal(Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        min={MIN_COMMUNITY_LOAN_RATE * 100}
        max={MAX_COMMUNITY_LOAN_RATE * 100}
        step={0.5}
        value={(rate * 100).toFixed(1)}
        onChange={(e) => setRate(Number(e.target.value) / 100)}
      />
      <input
        className={styles.formInput}
        type="number"
        min={MIN_COMMUNITY_LOAN_TERM_CYCLES}
        max={MAX_COMMUNITY_LOAN_TERM_CYCLES}
        step={30}
        value={termCycles}
        onChange={(e) => setTermCycles(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏦 Proposer ce prêt"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function LoanOffersSection({ company, onDone }: { company: CompanyDetailData; onDone: () => void }) {
  const committedPrincipal = company.loanOffers.reduce((sum, offer) => sum + offer.principal, 0);
  const availableToLend = Math.max(0, company.cashReserve - committedPrincipal);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🏦"
          title="Prêts entre joueurs"
          mechanic="Une entreprise peut proposer un prêt financé par sa propre trésorerie, avec un taux et une durée qu'elle fixe librement dans des bornes raisonnables — n'importe quel autre joueur peut l'accepter sur le marché commun."
          realWorld="C'est le principe du prêt entre particuliers ou entreprises (peer-to-peer lending) : en dehors du système bancaire classique, deux parties s'accordent directement sur un taux, généralement plus élevé qu'un prêt bancaire classique pour compenser l'absence de garanties institutionnelles."
        />
        <span>Prêts entre joueurs</span>
      </h2>
      <p className={styles.jobMeta}>
        Propose un prêt financé par la trésorerie de l'entreprise — taux et durée libres (dans des bornes
        raisonnables), n'importe quel autre joueur peut le prendre sur le marché commun.
      </p>

      {company.loanOffers.length > 0 && (
        <div className={styles.jobList}>
          {company.loanOffers.map((offer) => (
            <OfferRow key={offer.id} offer={offer} onDone={onDone} />
          ))}
        </div>
      )}

      {company.loansAsLender.length > 0 && (
        <>
          <h3 className={styles.jobMeta}>Prêts en cours (créances)</h3>
          <div className={styles.jobList}>
            {company.loansAsLender.map((loan) => (
              <ReceivableRow key={loan.id} loan={loan} />
            ))}
          </div>
        </>
      )}

      {company.isPrimaryOwner ? (
        <CreateOfferForm companyId={company.id} maxPrincipal={availableToLend} onDone={onDone} />
      ) : (
        <p className={styles.jobMeta}>Seul l'actionnaire principal peut proposer un prêt.</p>
      )}
    </section>
  );
}

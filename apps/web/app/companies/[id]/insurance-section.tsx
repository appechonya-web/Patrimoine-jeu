"use client";

import { useState, type FormEvent } from "react";
import { MIN_INSURANCE_COVERAGE_CAP, MIN_INSURANCE_PREMIUM_PER_CYCLE } from "@patrimoine-jeu/domain";
import type { CompanyInsuranceView, InsuranceOfferView } from "../../../lib/session";
import {
  GameError,
  cancelInsuranceOffer,
  cancelInsurancePolicy,
  createInsuranceOffer,
  subscribeToInsuranceOffer,
  subscribeToSystemInsurance,
} from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import { StatHint } from "../../stat-hint";
import styles from "../../page.module.css";

const COVERAGE_CAP_HINT =
  "Montant maximal remboursé pour UN sinistre — au-delà, la partie qui dépasse reste entièrement à la charge de l'entreprise assurée.";
const PREMIUM_HINT = "Coût fixe payé à chaque cycle, que tu subisses un sinistre ou non — le prix de la tranquillité.";

function ActivePolicyCard({ companyId, policy, onDone }: { companyId: string; policy: NonNullable<CompanyInsuranceView["activePolicy"]>; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelInsurancePolicy(companyId);
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
        <div className={styles.jobTitle}>Assurée par {policy.insurerName}</div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint={COVERAGE_CAP_HINT}>🛡️ Plafond {currencyFormatter.format(policy.coverageCap)}/sinistre</StatHint>
          </span>
          <span>
            <StatHint hint={PREMIUM_HINT}>💳 Prime {currencyFormatter.format(policy.premiumPerCycle)}/cycle</StatHint>
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
          {pending ? "…" : "🚫 Résilier"}
        </button>
      </div>
    </div>
  );
}

function OfferRow({ companyId, offer, onDone }: { companyId: string; offer: InsuranceOfferView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setError(null);
    setPending(true);
    try {
      await subscribeToInsuranceOffer(companyId, offer.id);
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
        <div className={styles.jobTitle}>{offer.insurerCompany.name}</div>
        <div className={styles.jobMeta}>
          {offer.insurerCompany.sector} — {offer.insurerCompany.municipality}
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint={COVERAGE_CAP_HINT}>🛡️ Plafond {currencyFormatter.format(offer.coverageCap)}/sinistre</StatHint>
          </span>
          <span>
            <StatHint hint={PREMIUM_HINT}>💳 Prime {currencyFormatter.format(offer.premiumPerCycle)}/cycle</StatHint>
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <button className={styles.apply} type="button" disabled={pending} onClick={handleSubscribe}>
          {pending ? "…" : "🤝 Souscrire"}
        </button>
      </div>
    </div>
  );
}

function OwnOfferRow({ offer, onDone }: { offer: CompanyInsuranceView["offersAsInsurer"][number]; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setError(null);
    setPending(true);
    try {
      await cancelInsuranceOffer(offer.id);
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
          {offer.status === "ACTIVE" ? `Assure ${offer.insuredCompanyName}` : "Offre publiée"}
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint={COVERAGE_CAP_HINT}>🛡️ Plafond {currencyFormatter.format(offer.coverageCap)}/sinistre</StatHint>
          </span>
          <span>
            <StatHint hint={PREMIUM_HINT}>💳 Prime {currencyFormatter.format(offer.premiumPerCycle)}/cycle</StatHint>
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        {offer.status === "OPEN" && (
          <button className={styles.logout} type="button" disabled={pending} onClick={handleCancel}>
            {pending ? "…" : "🚫 Retirer"}
          </button>
        )}
      </div>
    </div>
  );
}

function CreateOfferForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [premiumPerCycle, setPremiumPerCycle] = useState(MIN_INSURANCE_PREMIUM_PER_CYCLE);
  const [coverageCap, setCoverageCap] = useState(MIN_INSURANCE_COVERAGE_CAP);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createInsuranceOffer(companyId, premiumPerCycle, coverageCap);
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
        min={MIN_INSURANCE_PREMIUM_PER_CYCLE}
        step={1}
        value={premiumPerCycle}
        onChange={(e) => setPremiumPerCycle(Number(e.target.value))}
      />
      <input
        className={styles.formInput}
        type="number"
        min={MIN_INSURANCE_COVERAGE_CAP}
        step={10}
        value={coverageCap}
        onChange={(e) => setCoverageCap(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🛡️ Publier une offre d'assurance"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function InsuranceSection({
  companyId,
  isPrimaryOwner,
  insurance,
  offers,
  onDone,
}: {
  companyId: string;
  isPrimaryOwner: boolean;
  insurance: CompanyInsuranceView | null;
  offers: InsuranceOfferView[];
  onDone: () => void;
}) {
  const [pendingSystem, setPendingSystem] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);

  if (!isPrimaryOwner || !insurance) return null;

  async function handleSystemSubscribe() {
    setSystemError(null);
    setPendingSystem(true);
    try {
      await subscribeToSystemInsurance(companyId);
      onDone();
    } catch (err) {
      setSystemError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPendingSystem(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🛡️"
          title="Assurance"
          mechanic="Couvre une partie des pertes d'un aléa d'entreprise négatif contre une prime payée chaque cycle. L'assureur système est toujours solvable mais peu avantageux ; un assureur-joueur peut proposer de meilleures conditions, mais avec un vrai risque : s'il encaisse plusieurs sinistres le même cycle, il peut manquer de trésorerie avant d'avoir indemnisé tout le monde."
          realWorld="C'est le risque de concentration que gèrent les vrais assureurs : sans diversification (beaucoup de clients, beaucoup de secteurs) ou réassurance, un assureur qui couvre plusieurs sinistrés touchés par le même choc au même moment peut se retrouver incapable d'honorer tous ses engagements — exactement pourquoi les assureurs réels réassurent une partie de leur risque."
        />
        <span>Assurance</span>
      </h2>
      <p className={styles.jobMeta}>
        Couvre les pertes d'un aléa d'entreprise négatif — l'assureur système est toujours solvable mais moins
        avantageux ; un assureur-joueur peut proposer mieux, avec un vrai risque de ne pouvoir payer si plusieurs
        sinistres tombent le même cycle.
      </p>

      {insurance.activePolicy ? (
        <ActivePolicyCard companyId={companyId} policy={insurance.activePolicy} onDone={onDone} />
      ) : (
        <>
          {systemError && <p className={styles.error}>{systemError}</p>}
          <button className={styles.apply} type="button" disabled={pendingSystem} onClick={handleSystemSubscribe}>
            {pendingSystem ? "…" : "🛡️ Souscrire à l'assurance système"}
          </button>

          {offers.length > 0 && (
            <div className={styles.jobList}>
              {offers.map((offer) => (
                <OfferRow key={offer.id} companyId={companyId} offer={offer} onDone={onDone} />
              ))}
            </div>
          )}
        </>
      )}

      <h3 className={styles.jobMeta}>Assureur pour d'autres entreprises</h3>
      {insurance.offersAsInsurer.length > 0 && (
        <div className={styles.jobList}>
          {insurance.offersAsInsurer.map((offer) => (
            <OwnOfferRow key={offer.id} offer={offer} onDone={onDone} />
          ))}
        </div>
      )}
      <CreateOfferForm companyId={companyId} onDone={onDone} />
    </section>
  );
}

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { MAX_REGISTRATION_DUTY_RATE_DELTA, MIN_INFRASTRUCTURE_CONTRIBUTION } from "@patrimoine-jeu/domain";
import type { CouncilProposalView, MunicipalityContributorView, MunicipalitySummaryView } from "../../../lib/session";
import { GameError, castCouncilVote, contributeToInfrastructure, createCouncilProposal } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function ContributeForm({ municipalityId, onDone }: { municipalityId: string; onDone: () => void }) {
  const [amount, setAmount] = useState(MIN_INFRASTRUCTURE_CONTRIBUTION);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await contributeToInfrastructure(municipalityId, amount);
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
        min={MIN_INFRASTRUCTURE_CONTRIBUTION}
        step={50}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏗️ Contribuer"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function ProposalCard({ proposal, onDone }: { proposal: CouncilProposalView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVote(inFavor: boolean) {
    setError(null);
    setPending(true);
    try {
      await castCouncilVote(proposal.id, inFavor);
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
          Droits d'enregistrement → {(proposal.newRegistrationDutyRate * 100).toFixed(1)}%
        </div>
        <div className={styles.jobMeta}>Proposé par {proposal.proposerPseudo}</div>
        <div className={styles.jobStats}>
          <span>✅ Pour {proposal.forWeight.toFixed(0)}</span>
          <span>❌ Contre {proposal.againstWeight.toFixed(0)}</span>
          {proposal.status !== "OPEN" && <span>{proposal.status === "APPROVED" ? "Approuvée" : "Rejetée"}</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      {proposal.status === "OPEN" && (
        <div className={styles.jobActions}>
          <button className={styles.apply} type="button" disabled={pending} onClick={() => handleVote(true)}>
            {pending ? "…" : "✅ Pour"}
          </button>
          <button className={styles.logout} type="button" disabled={pending} onClick={() => handleVote(false)}>
            {pending ? "…" : "❌ Contre"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateProposalForm({
  municipalityId,
  currentRate,
  onDone,
}: {
  municipalityId: string;
  currentRate: number;
  onDone: () => void;
}) {
  const [rate, setRate] = useState(currentRate);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await createCouncilProposal(municipalityId, rate);
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  const min = Math.max(0.01, currentRate - MAX_REGISTRATION_DUTY_RATE_DELTA);
  const max = currentRate + MAX_REGISTRATION_DUTY_RATE_DELTA;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.formInput}
        type="number"
        min={min}
        max={max}
        step={0.001}
        value={rate}
        onChange={(e) => setRate(Number(e.target.value))}
      />
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🏛️ Proposer au conseil"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function ProvinceDetail({
  municipalityId,
  summary,
  contributors,
  proposals,
  myPseudo,
}: {
  municipalityId: string;
  summary: MunicipalitySummaryView;
  contributors: MunicipalityContributorView[];
  proposals: CouncilProposalView[];
  myPseudo: string;
}) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  const hasOpenProposal = proposals.some((p) => p.status === "OPEN");
  const isContributor = contributors.some((c) => c.playerPseudo === myPseudo);

  return (
    <>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏗️"
            title="Fonds d'infrastructure"
            mechanic="Le fonds cumulé de la province a deux effets distincts pour TOUTES les entreprises qui y sont installées, à rendement décroissant (les premiers euros comptent plus que les suivants) : un bonus d'attractivité (une part plus grande d'un marché national partagé avec les concurrents du secteur) ET un bonus de clientèle locale — de la demande neuve, propre à chaque entreprise de la province, qui ne vient du panier d'aucun concurrent. Le total investi dans TOUTES les provinces du jeu contribue aussi à faire grossir la demande nationale elle-même."
            realWorld="C'est un vrai bien public local financé collectivement : personne n'est exclu du bénéfice même sans contribuer. Une région qui investit dans ses infrastructures attire de nouveaux habitants (plus de clients pour tout le monde) ET rend son tissu économique plus compétitif à l'échelle nationale — deux effets réels et distincts d'un même investissement."
          />
          <span>Fonds d'infrastructure</span>
        </h2>
        <div className={styles.jobStats}>
          <span>💰 Fonds cumulé {currencyFormatter.format(summary.infrastructureFund)}</span>
          <span>⭐ Bonus d'attractivité +{summary.attractivenessBonus.toFixed(1)} pour toutes les entreprises de la province</span>
          <span>👥 +{(summary.localDemandBonus * 100).toFixed(1)}% de clientèle locale pour les entreprises de la province</span>
          <span>📋 Droits d'enregistrement {(summary.registrationDutyRate * 100).toFixed(1)}%</span>
        </div>
        <ContributeForm municipalityId={municipalityId} onDone={handleDone} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏆"
            title="Contributeurs"
            mechanic="Liste publique de qui a contribué au fonds, et combien — visible par tous les joueurs consultant cette province."
            realWorld="Comme les listes de donateurs affichées par certaines institutions publiques ou associations : la reconnaissance publique fait partie de l'incitation à contribuer, en plus du bénéfice économique direct."
          />
          <span>Contributeurs (statut visible)</span>
        </h2>
        {contributors.length === 0 ? (
          <p className={styles.jobMeta}>Aucun contributeur pour l'instant.</p>
        ) : (
          <div className={styles.jobStats}>
            {contributors.map((c) => (
              <span key={c.playerPseudo}>
                {c.playerPseudo} : {currencyFormatter.format(c.amount)}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏛️"
            title="Conseil provincial"
            mechanic="Réservé aux contributeurs du fonds — le poids de vote est ta contribution cumulée à CETTE province. Le levier votable est le taux des droits d'enregistrement (immobilier), plafonné à ±2 points de pourcentage par proposition."
            realWorld="Un vrai mécanisme de démocratie censitaire locale : le pouvoir de décision est proportionnel à l'investissement dans la collectivité, pas une voix par habitant — comme certains conseils de copropriété où le poids de vote suit les parts détenues."
          />
          <span>Conseil provincial</span>
        </h2>
        <p className={styles.jobMeta}>
          Réservé aux contributeurs du fonds d'infrastructure — le poids de vote est ta contribution cumulée à cette
          province.
        </p>
        {proposals.length > 0 && (
          <div className={styles.jobList}>
            {proposals.map((proposal) => (
              <ProposalCard key={proposal.id} proposal={proposal} onDone={handleDone} />
            ))}
          </div>
        )}
        {isContributor && !hasOpenProposal && (
          <CreateProposalForm
            municipalityId={municipalityId}
            currentRate={summary.registrationDutyRate}
            onDone={handleDone}
          />
        )}
        {!isContributor && (
          <p className={styles.jobMeta}>Contribue au fonds d'infrastructure pour pouvoir proposer et voter.</p>
        )}
      </section>
    </>
  );
}

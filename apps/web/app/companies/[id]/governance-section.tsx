"use client";

import { useState, type FormEvent } from "react";
import { INVESTMENT_AXES, INVESTMENT_AXIS_LABELS, MAX_INVESTMENT_PER_CYCLE, MIN_INVESTMENT_AMOUNT, type InvestmentAxis } from "@patrimoine-jeu/domain";
import type { CompanyDetail as CompanyDetailData, ProposalView } from "../../../lib/session";
import { GameError, castVote, createDistributionPolicyProposal, createInvestProposal } from "../../../lib/game-client";
import { currencyFormatter } from "../../../lib/format";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

function proposalLabel(proposal: ProposalView): string {
  if (proposal.type === "SET_DISTRIBUTION_POLICY") {
    const policy = (proposal.payload as { distributionPolicy: "dividend" | "reserve" }).distributionPolicy;
    return `Politique de distribution → ${policy === "dividend" ? "dividendes" : "réserve"}`;
  }
  const { axis, amount } = proposal.payload as { axis: string; amount: number };
  return `Investir ${currencyFormatter.format(amount)} dans ${INVESTMENT_AXIS_LABELS[axis as InvestmentAxis] ?? axis}`;
}

function ProposalCard({
  proposal,
  mySharePercentage,
  onDone,
}: {
  proposal: ProposalView;
  mySharePercentage: number;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVote(inFavor: boolean) {
    setError(null);
    setPending(true);
    try {
      await castVote(proposal.id, inFavor);
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
        <div className={styles.jobTitle}>{proposalLabel(proposal)}</div>
        <div className={styles.jobMeta}>Proposé par {proposal.proposerPseudo}</div>
        <div className={styles.jobStats}>
          <span>✅ Pour {proposal.forWeight.toFixed(0)}%</span>
          <span>❌ Contre {proposal.againstWeight.toFixed(0)}%</span>
          {proposal.status !== "OPEN" && <span>{proposal.status === "APPROVED" ? "Approuvée" : "Rejetée"}</span>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      {proposal.status === "OPEN" && mySharePercentage > 0 && (
        <div className={styles.jobActions}>
          <button
            className={styles.apply}
            type="button"
            disabled={pending}
            onClick={() => handleVote(true)}
            style={proposal.myVote === true ? { fontWeight: "bold" } : undefined}
          >
            {pending ? "…" : "✅ Pour"}
          </button>
          <button
            className={styles.logout}
            type="button"
            disabled={pending}
            onClick={() => handleVote(false)}
            style={proposal.myVote === false ? { fontWeight: "bold" } : undefined}
          >
            {pending ? "…" : "❌ Contre"}
          </button>
        </div>
      )}
    </div>
  );
}

function CreateProposalForm({ companyId, onDone }: { companyId: string; onDone: () => void }) {
  const [kind, setKind] = useState<"policy" | "invest">("policy");
  const [distributionPolicy, setDistributionPolicy] = useState<"dividend" | "reserve">("dividend");
  const [axis, setAxis] = useState<InvestmentAxis>(INVESTMENT_AXES[0]);
  const [amount, setAmount] = useState(MIN_INVESTMENT_AMOUNT);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (kind === "policy") {
        await createDistributionPolicyProposal(companyId, distributionPolicy);
      } else {
        await createInvestProposal(companyId, axis, amount);
      }
      onDone();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <select className={styles.formInput} value={kind} onChange={(e) => setKind(e.target.value as "policy" | "invest")}>
        <option value="policy">Changer la politique de distribution</option>
        <option value="invest">Investir dans un levier</option>
      </select>
      {kind === "policy" ? (
        <select
          className={styles.formInput}
          value={distributionPolicy}
          onChange={(e) => setDistributionPolicy(e.target.value as "dividend" | "reserve")}
        >
          <option value="dividend">Dividendes</option>
          <option value="reserve">Réserve</option>
        </select>
      ) : (
        <>
          <select className={styles.formInput} value={axis} onChange={(e) => setAxis(e.target.value as InvestmentAxis)}>
            {INVESTMENT_AXES.map((a) => (
              <option key={a} value={a}>
                {INVESTMENT_AXIS_LABELS[a]}
              </option>
            ))}
          </select>
          <input
            className={styles.formInput}
            type="number"
            min={MIN_INVESTMENT_AMOUNT}
            max={MAX_INVESTMENT_PER_CYCLE}
            step={50}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </>
      )}
      <button className={styles.apply} type="submit" disabled={pending}>
        {pending ? "…" : "🗳️ Proposer au vote"}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

export function GovernanceSection({
  company,
  proposals,
  onDone,
}: {
  company: CompanyDetailData;
  proposals: ProposalView[];
  onDone: () => void;
}) {
  if (company.sharePercentage <= 0) return null;

  const hasOpenProposal = proposals.some((p) => p.status === "OPEN");

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🗳️"
          title="Assemblée générale"
          mechanic="N'importe quel actionnaire peut proposer une décision (politique de distribution, investissement) — le vote est pondéré par les parts détenues, pas une voix par joueur. Une proposition s'applique dès qu'un camp franchit 50% des parts totales, même sans l'accord de l'actionnaire principal."
          realWorld="C'est le principe réel de la gouvernance d'entreprise par assemblée générale : le pouvoir de décision est proportionnel au capital détenu (une action = une voix), pas égalitaire entre personnes — un actionnaire minoritaire coalisé avec d'autres peut légalement imposer une décision à l'actionnaire historique."
        />
        <span>Assemblée générale</span>
      </h2>
      <p className={styles.jobMeta}>
        N'importe quel actionnaire peut proposer une décision — le vote est pondéré par les parts détenues, pas une
        voix par joueur. Une proposition s'applique dès qu'un camp franchit 50% des parts totales, même sans l'accord
        de l'actionnaire principal.
      </p>

      {proposals.length > 0 && (
        <div className={styles.jobList}>
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              mySharePercentage={company.sharePercentage}
              onDone={onDone}
            />
          ))}
        </div>
      )}

      {!hasOpenProposal && <CreateProposalForm companyId={company.id} onDone={onDone} />}
    </section>
  );
}

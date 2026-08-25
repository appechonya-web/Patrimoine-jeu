"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Company, ExpansionRequirement, Municipality, Sector } from "../lib/session";
import { GameError, foundCompany } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import { StatHint } from "./stat-hint";
import styles from "./page.module.css";

function CompanySummaryCard({ company }: { company: Company }) {
  return (
    <Link href={`/companies/${company.id}`} className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {company.name}
          {company.status === "BANKRUPT" && " 💥 Faillite"}
        </div>
        <div className={styles.jobMeta}>
          {company.sector} — {company.municipality} — {company.sharePercentage}% des parts
        </div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Force commerciale de l'entreprise face à ses concurrents du même marché — plus haut capte une plus grande part de la demande disponible. Ouvre la fiche entreprise pour le détail (base, manager, infrastructures, secteur).">
              ⭐ Attractivité {company.effectiveAttractiveness.toFixed(0)}/100
            </StatHint>
          </span>
          <span>
            <StatHint hint="Un manager par département évite la pénalité d'attention (plusieurs entreprises sans manager se marchent dessus) et stabilise le moral de l'équipe — mais coûte un salaire fixe par cycle.">
              {company.hasManager ? "🧑‍💼 Avec manager" : "🚫 Sans manager"}
            </StatHint>
          </span>
          <span>
            <StatHint hint="Effectif total, tous départements confondus — détermine la capacité de production de l'entreprise, pondérée par le moral de chaque département.">
              👥 {company.totalEmployeeCount} employé{company.totalEmployeeCount > 1 ? "s" : ""}
            </StatHint>
          </span>
          {company.latestCycleReport && (
            <span>
              <StatHint hint="Unités vendues au dernier cycle, toutes gammes confondues.">
                📦 {company.latestCycleReport.unitsSold.toFixed(1)} unités vendues
              </StatHint>
            </span>
          )}
        </div>
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>
          {company.latestCycleReport ? currencyFormatter.format(company.latestCycleReport.netProfit) : "—"}
          <span className={styles.jobMeta}> / cycle net</span>
        </div>
        <span className={styles.jobMeta}>Gérer →</span>
      </div>
    </Link>
  );
}

export function CompaniesSection({
  companies,
  sectors,
  municipalities,
  nextFoundingCost,
  canFoundAnother,
  expansionRequirement,
}: {
  companies: Company[];
  sectors: Sector[];
  municipalities: Municipality[];
  nextFoundingCost: number;
  canFoundAnother: boolean;
  expansionRequirement: ExpansionRequirement | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState(sectors[0]?.id ?? "");
  const [municipalityId, setMunicipalityId] = useState(municipalities[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await foundCompany(name, sectorId, municipalityId);
      setName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="entreprises" className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏢"
            title="Entreprises"
            mechanic="Fonder une entreprise de niveau 0 (matières premières, accessible sans condition) coûte un capital de départ fixe. Une entreprise supplémentaire exige d'avoir fait ses preuves sur une entreprise déjà possédée (temps d'activité + profit cumulé), et coûte deux fois plus cher à fonder que la précédente."
            realWorld="Le coût croissant reproduit la réalité de la diversification entrepreneuriale : un premier succès facilite l'accès au capital pour le suivant (crédibilité, garanties), mais chaque nouvelle structure demande un investissement personnel plus lourd, pas juste plus d'argent disponible."
          />
          <span>Entreprises</span>
        </h2>
      </div>

      {companies.length > 0 && (
        <div className={styles.jobList}>
          {companies.map((company) => (
            <CompanySummaryCard key={company.id} company={company} />
          ))}
        </div>
      )}

      {canFoundAnother ? (
        <form className={styles.form} onSubmit={handleSubmit}>
          <input
            className={styles.formInput}
            type="text"
            placeholder="Nom de l'entreprise"
            required
            minLength={2}
            maxLength={64}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className={styles.formInput}
            value={sectorId}
            onChange={(e) => setSectorId(e.target.value)}
            required
          >
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.name}
                {sector.level > 0 ? ` (palier ${sector.level} — nécessite une entreprise dans le secteur parent)` : ""}
              </option>
            ))}
          </select>
          <select
            className={styles.formInput}
            value={municipalityId}
            onChange={(e) => setMunicipalityId(e.target.value)}
            required
          >
            {municipalities.map((municipality) => (
              <option key={municipality.id} value={municipality.id}>
                {municipality.region.name} — {municipality.name}
              </option>
            ))}
          </select>
          <button className={styles.apply} type="submit" disabled={submitting || !sectorId || !municipalityId}>
            {submitting ? "…" : `🚀 Fonder (${currencyFormatter.format(nextFoundingCost)})`}
          </button>
        </form>
      ) : (
        <p className={styles.jobMeta}>
          Fonder une entreprise supplémentaire demande d'avoir fait ses preuves sur une entreprise existante
          {expansionRequirement &&
            ` (au moins ${expansionRequirement.minCyclesActive} cycles d'activité et ${currencyFormatter.format(expansionRequirement.minCumulativeNetProfit)} de profit net cumulé)`}
          .
        </p>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </section>
  );
}

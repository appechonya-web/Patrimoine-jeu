import Link from "next/link";
import type { CompanyDetail as CompanyDetailData } from "../../../lib/session";
import { InfoTip } from "../../info-tip";
import styles from "../../page.module.css";

export function GroupSection({ company }: { company: CompanyDetailData }) {
  if (company.subsidiaries.length === 0 && !company.parentHolding) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🏛️"
          title="Groupe"
          mechanic="Une entreprise peut détenir des parts d'une autre (via l'OPA, le rachat amical, une cotation ou le capital-risque, en choisissant d'acheter 'en tant que' cette entreprise plutôt qu'en ton nom propre) — les dividendes d'une filiale alimentent alors la trésorerie de la société-mère plutôt que ton patrimoine personnel, un vrai levier de composition au lieu d'entreprises isolées."
          realWorld="C'est la structure d'une vraie holding : la société-mère consolide les résultats de ses filiales dans son propre bilan (cf. Finance) et peut les réinvestir ou les faire remonter à ses propres actionnaires, sans que chaque filiale reste un silo isolé."
        />
        <span>Groupe</span>
      </h2>
      {company.parentHolding && (
        <p className={styles.jobMeta}>
          Filiale à {company.parentHolding.sharePercentage.toFixed(0)}% de{" "}
          <Link href={`/companies/${company.parentHolding.id}`}>{company.parentHolding.name}</Link>.
        </p>
      )}
      {company.subsidiaries.length > 0 && (
        <div className={styles.jobList}>
          {company.subsidiaries.map((sub) => (
            <div key={sub.id} className={styles.jobCard}>
              <div>
                <div className={styles.jobTitle}>
                  <Link href={`/companies/${sub.id}`}>{sub.name}</Link>
                </div>
                <div className={styles.jobStats}>
                  <span>🧩 {sub.sharePercentage.toFixed(0)}% détenus</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import type { CycleReportView } from "../../lib/session";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

interface RecapLine {
  key: keyof CycleReportView;
  icon: string;
  label: string;
}

const LIQUID_LINES: RecapLine[] = [
  { key: "salaryIncome", icon: "💼", label: "Salaire net" },
  { key: "independentActivityIncome", icon: "🧑‍💻", label: "Revenu d'indépendant complémentaire" },
  { key: "dividendIncome", icon: "🏢", label: "Part de profit/perte d'entreprise (actionnariat)" },
  { key: "rentIncome", icon: "🏠", label: "Loyers perçus" },
  { key: "mortgagePayment", icon: "🏦", label: "Échéance de prêt (hypothèque/communautaire)" },
  { key: "lifeEventDelta", icon: "🎲", label: "Événement de vie" },
  { key: "assetDividendCashIncome", icon: "📈", label: "Dividendes d'actions (en liquide)" },
  { key: "achievementReward", icon: "🏅", label: "Récompense de défi" },
  { key: "bankFailurePayout", icon: "🚨", label: "Remboursement suite à faillite bancaire" },
];

const NON_LIQUID_LINES: RecapLine[] = [
  { key: "assetDividendReinvestedValue", icon: "📈", label: "Dividendes d'actions réinvestis (plus de parts, pas de liquide)" },
  { key: "savingsInterestAccrued", icon: "🐷", label: "Intérêts d'épargne (capitalisés dans le compte)" },
];

function RecapRow({ line, value }: { line: RecapLine; value: number }) {
  if (Math.abs(value) < 0.005) return null;
  return (
    <div className={styles.wealthLegendItem}>
      <span className={styles.wealthLegendLabel}>
        {line.icon} {line.label}
      </span>
      <span
        className={styles.wealthLegendValue}
        style={{ color: value >= 0 ? "var(--wellbeing)" : "var(--danger)" }}
      >
        {value >= 0 ? "+" : ""}
        {currencyFormatter.format(value)}
      </span>
    </div>
  );
}

export function CycleRecap({ report }: { report: CycleReportView | null }) {
  if (!report) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>📋 Récap du cycle</span>
        </h2>
        <p className={styles.jobMeta}>Le récap apparaîtra ici après la prochaine clôture de cycle.</p>
      </section>
    );
  }

  const liquidRows = LIQUID_LINES.filter((line) => Math.abs(report[line.key] as number) >= 0.005);
  const nonLiquidRows = NON_LIQUID_LINES.filter((line) => Math.abs(report[line.key] as number) >= 0.005);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="📋"
          title="Récap du cycle"
          mechanic="Le détail de tout ce qui a fait bouger ton patrimoine liquide à la dernière clôture de cycle, catégorie par catégorie — reconstitué à partir des mêmes calculs que la clôture elle-même, pas une estimation. Les achats/ventes que tu fais toi-même (immobilier, placements, dons...) ne sont pas ici : ils s'appliquent immédiatement, pas à la clôture de cycle."
          realWorld="C'est l'équivalent d'un relevé de compte détaillé : au lieu de constater juste que le solde a changé, tu vois virement par virement (salaire, loyer, dividende, échéance de prêt...) ce qui l'explique."
        />
        <span>Récap du cycle n°{report.cycleNumber}</span>
      </h2>
      {liquidRows.length === 0 && nonLiquidRows.length === 0 ? (
        <p className={styles.jobMeta}>Aucun mouvement particulier ce cycle.</p>
      ) : (
        <>
          {liquidRows.length > 0 && (
            <div className={styles.wealthLegend}>
              {liquidRows.map((line) => (
                <RecapRow key={line.key} line={line} value={report[line.key] as number} />
              ))}
              <div className={styles.wealthLegendItem}>
                <span className={styles.wealthLegendLabel} style={{ fontWeight: 700, color: "var(--text)" }}>
                  Total liquide ce cycle
                </span>
                <span
                  className={styles.wealthLegendValue}
                  style={{ color: report.totalLiquidChange >= 0 ? "var(--wellbeing)" : "var(--danger)" }}
                >
                  {report.totalLiquidChange >= 0 ? "+" : ""}
                  {currencyFormatter.format(report.totalLiquidChange)}
                </span>
              </div>
            </div>
          )}
          {nonLiquidRows.length > 0 && (
            <>
              <p className={styles.jobMeta} style={{ marginTop: "0.9rem" }}>
                Non-liquide ce cycle (capitalisé, pas encore encaissé) :
              </p>
              <div className={styles.wealthLegend}>
                {nonLiquidRows.map((line) => (
                  <RecapRow key={line.key} line={line} value={report[line.key] as number} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

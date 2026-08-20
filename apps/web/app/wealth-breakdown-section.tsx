import type { WealthBreakdownView } from "../lib/session";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

interface Category {
  key: keyof Omit<WealthBreakdownView, "total">;
  icon: string;
  label: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { key: "wealthLiquid", icon: "💰", label: "Liquide", color: "var(--gold)" },
  { key: "propertyEquity", icon: "🏠", label: "Immobilier", color: "var(--wealth-property)" },
  { key: "companyEquity", icon: "🏢", label: "Entreprises", color: "var(--wealth-company)" },
  { key: "commodityValue", icon: "🌾", label: "Matières premières", color: "var(--wealth-commodity)" },
  { key: "savingsValue", icon: "🐷", label: "Épargne", color: "var(--wellbeing)" },
  { key: "personalGoodsValue", icon: "🛍️", label: "Biens personnels", color: "var(--wealth-goods)" },
];

export function WealthBreakdownSection({ breakdown }: { breakdown: WealthBreakdownView | null }) {
  if (!breakdown || breakdown.total <= 0) return null;

  const segments = CATEGORIES.map((category) => ({
    ...category,
    amount: breakdown[category.key],
    percent: (breakdown[category.key] / breakdown.total) * 100,
  })).filter((segment) => segment.amount > 0);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🥧"
          title="Répartition du patrimoine"
          mechanic="Ton patrimoine net décomposé par catégorie d'actif, recalculé en direct à partir de ce que tu possèdes réellement en ce moment — pas un instantané figé à la dernière clôture de cycle."
          realWorld="C'est le principe de base de la diversification patrimoniale réelle : ne pas avoir tout son argent concentré dans une seule catégorie d'actif (tout en liquide, tout en immobilier...) répartit le risque — un vrai conseiller financier commence toujours par regarder cette répartition."
          tip="Un patrimoine très concentré sur une seule catégorie (souvent le liquide ou une seule entreprise) n'est pas forcément un problème, mais c'est un vrai risque si cette catégorie unique s'effondre — diversifier, c'est amortir ce risque."
        />
        <span>Répartition du patrimoine</span>
      </h2>

      <div className={styles.wealthBar}>
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={styles.wealthBarSegment}
            style={{ width: `${segment.percent}%`, background: segment.color }}
          />
        ))}
      </div>

      <div className={styles.wealthLegend}>
        {segments.map((segment) => (
          <div key={segment.key} className={styles.wealthLegendItem}>
            <span className={styles.wealthLegendSwatch} style={{ background: segment.color }} />
            <span className={styles.wealthLegendLabel}>
              {segment.icon} {segment.label}
            </span>
            <span className={styles.wealthLegendValue}>{currencyFormatter.format(segment.amount)}</span>
            <span className={styles.wealthLegendPercent}>{segment.percent.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

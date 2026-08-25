import type { AssetPricePoint } from "../../lib/session";
import styles from "../page.module.css";

const CHART_WIDTH = 280;
const CHART_HEIGHT = 56;
const CHART_PADDING_Y = 4;

function buildPath(history: AssetPricePoint[]): { line: string; area: string } {
  const prices = history.map((point) => point.price);
  const cycles = history.map((point) => point.cycleNumber);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minCycle = Math.min(...cycles);
  const maxCycle = Math.max(...cycles);
  const priceRange = maxPrice - minPrice || 1;
  const cycleRange = maxCycle - minCycle || 1;
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  const coords = history.map((point) => {
    const x = ((point.cycleNumber - minCycle) / cycleRange) * CHART_WIDTH;
    const y = CHART_PADDING_Y + usableHeight - ((point.price - minPrice) / priceRange) * usableHeight;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;

  return { line, area };
}

/**
 * Le suivi du cours (FinancialAssetPriceHistory) n'existe qu'à partir du
 * cycle où cette fonctionnalité a été introduite — les cours antérieurs
 * n'ont jamais été journalisés, donc l'historique démarre à ce cycle-là,
 * pas au tout premier cycle du jeu.
 */
export function AssetPriceChart({ history }: { history: AssetPricePoint[] }) {
  if (history.length < 2) {
    return <p className={styles.jobMeta}>Historique du cours en cours de constitution — reviens dans quelques cycles.</p>;
  }

  const { line, area } = buildPath(history);
  const first = history[0];
  const last = history[history.length - 1];
  const delta = last.price - first.price;
  const deltaPercent = first.price !== 0 ? (delta / first.price) * 100 : 0;
  const isUp = delta >= 0;

  return (
    <div className={styles.assetChart}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className={styles.assetChartSvg} preserveAspectRatio="none">
        <path d={area} className={isUp ? styles.assetChartAreaUp : styles.assetChartAreaDown} />
        <path d={line} className={isUp ? styles.assetChartLineUp : styles.assetChartLineDown} />
      </svg>
      <span className={styles.assetChartDelta} style={{ color: isUp ? "var(--wellbeing)" : "var(--danger)" }}>
        {isUp ? "+" : ""}
        {deltaPercent.toFixed(1)}% depuis le cycle n°{first.cycleNumber}
      </span>
    </div>
  );
}

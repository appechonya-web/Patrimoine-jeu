import type { AssetPricePoint } from "../../lib/session";
import { currencyFormatter } from "../../lib/format";
import styles from "../page.module.css";

const CHART_WIDTH = 280;
const CHART_HEIGHT = 72;
const CHART_PADDING_Y = 10;

/** Fenêtre glissante plutôt que tout l'historique depuis l'origine — comme
 * un vrai graphique boursier ("1 mois", "1 an"...), pas une comparaison
 * figée à jamais sur le tout premier cycle suivi. ~60 cycles = ~30h de jeu. */
const CHART_WINDOW_CYCLES = 60;

interface Scale {
  toXY(point: AssetPricePoint): readonly [number, number];
}

function buildScale(history: AssetPricePoint[]): Scale {
  const prices = history.map((point) => point.price);
  const cycles = history.map((point) => point.cycleNumber);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minCycle = Math.min(...cycles);
  const maxCycle = Math.max(...cycles);
  const priceRange = maxPrice - minPrice || 1;
  const cycleRange = maxCycle - minCycle || 1;
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  return {
    toXY(point) {
      const x = ((point.cycleNumber - minCycle) / cycleRange) * CHART_WIDTH;
      const y = CHART_PADDING_Y + usableHeight - ((point.price - minPrice) / priceRange) * usableHeight;
      return [x, y] as const;
    },
  };
}

/**
 * Le suivi du cours (FinancialAssetPriceHistory) n'existe qu'à partir du
 * cycle où cette fonctionnalité a été introduite — les cours antérieurs
 * n'ont jamais été journalisés, donc l'historique démarre à ce cycle-là,
 * pas au tout premier cycle du jeu.
 */
export function AssetPriceChart({ history }: { history: AssetPricePoint[] }) {
  const windowed = history.slice(-CHART_WINDOW_CYCLES);

  if (windowed.length < 2) {
    return <p className={styles.jobMeta}>Historique du cours en cours de constitution — reviens dans quelques cycles.</p>;
  }

  const scale = buildScale(windowed);
  const coords = windowed.map(scale.toXY);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;

  const first = windowed[0];
  const last = windowed[windowed.length - 1];
  const delta = last.price - first.price;
  const deltaPercent = first.price !== 0 ? (delta / first.price) * 100 : 0;
  const isUp = delta >= 0;

  const high = windowed.reduce((max, point) => (point.price > max.price ? point : max), windowed[0]);
  const low = windowed.reduce((min, point) => (point.price < min.price ? point : min), windowed[0]);
  const [highX, highY] = scale.toXY(high);
  const [lowX, lowY] = scale.toXY(low);
  const [, openY] = scale.toXY(first);

  return (
    <div className={styles.assetChart}>
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className={styles.assetChartSvg} preserveAspectRatio="none">
        <line x1={0} y1={openY} x2={CHART_WIDTH} y2={openY} className={styles.assetChartBaseline} />
        <path d={area} className={isUp ? styles.assetChartAreaUp : styles.assetChartAreaDown} />
        <path d={line} className={isUp ? styles.assetChartLineUp : styles.assetChartLineDown} />
        <circle cx={highX} cy={highY} r={2.5} className={styles.assetChartHighDot} />
        <circle cx={lowX} cy={lowY} r={2.5} className={styles.assetChartLowDot} />
      </svg>
      <div className={styles.assetChartLegend}>
        <span className={styles.assetChartDelta} style={{ color: isUp ? "var(--wellbeing)" : "var(--danger)" }}>
          {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
          {deltaPercent.toFixed(1)}% sur {windowed.length} cycles
        </span>
        <span className={styles.assetChartHighLow}>
          🔺 {currencyFormatter.format(high.price)} · 🔻 {currencyFormatter.format(low.price)}
        </span>
      </div>
    </div>
  );
}

import type { WealthHistoryPoint } from "../lib/session";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const CHART_PADDING_Y = 12;

function buildPath(history: WealthHistoryPoint[]): { line: string; area: string } {
  const values = history.map((point) => point.netWorth);
  const cycles = history.map((point) => point.cycleNumber);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const minCycle = Math.min(...cycles);
  const maxCycle = Math.max(...cycles);
  const valueRange = maxValue - minValue || 1;
  const cycleRange = maxCycle - minCycle || 1;
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  const coords = history.map((point) => {
    const x = ((point.cycleNumber - minCycle) / cycleRange) * CHART_WIDTH;
    const y = CHART_PADDING_Y + usableHeight - ((point.netWorth - minValue) / valueRange) * usableHeight;
    return [x, y] as const;
  });

  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;

  return { line, area };
}

export function WealthHistoryChart({ history }: { history: WealthHistoryPoint[] }) {
  if (history.length < 2) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="📈"
            title="Évolution du patrimoine"
            mechanic="Un point par cycle clôturé. Il en faut au moins deux pour tracer une courbe — reviens après le prochain cycle."
            realWorld="C'est l'équivalent du relevé de performance qu'envoie un gestionnaire de patrimoine : ce qui compte n'est jamais la photo à un instant donné, mais la tendance dans la durée."
          />
          <span>Évolution du patrimoine</span>
        </h2>
        <p className={styles.jobMeta}>L'historique s'affichera ici à partir du prochain cycle clôturé.</p>
      </section>
    );
  }

  const { line, area } = buildPath(history);
  const first = history[0];
  const last = history[history.length - 1];
  const delta = last.netWorth - first.netWorth;
  const deltaPercent = first.netWorth !== 0 ? (delta / Math.abs(first.netWorth)) * 100 : 0;
  const peak = history.reduce((max, point) => (point.netWorth > max.netWorth ? point : max), first);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="📈"
          title="Évolution du patrimoine"
          mechanic="Ton patrimoine net à chaque clôture de cycle, du plus ancien au plus récent — les mêmes points que ceux utilisés pour ton classement dans la compétition."
          realWorld="C'est l'équivalent du relevé de performance qu'envoie un gestionnaire de patrimoine : ce qui compte n'est jamais la photo à un instant donné, mais la tendance dans la durée."
        />
        <span>Évolution du patrimoine</span>
      </h2>

      <div className={styles.historyChart}>
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className={styles.historyChartSvg} preserveAspectRatio="none">
          <path d={area} className={styles.historyChartArea} />
          <path d={line} className={styles.historyChartLine} />
        </svg>
      </div>

      <div className={styles.historyStats}>
        <div className={styles.historyStat}>
          <span className={styles.historyStatLabel}>Depuis le cycle {first.cycleNumber}</span>
          <span
            className={styles.historyStatValue}
            style={{ color: delta >= 0 ? "var(--wellbeing)" : "var(--danger)" }}
          >
            {delta >= 0 ? "+" : ""}
            {currencyFormatter.format(delta)} ({deltaPercent >= 0 ? "+" : ""}
            {deltaPercent.toFixed(1)}%)
          </span>
        </div>
        <div className={styles.historyStat}>
          <span className={styles.historyStatLabel}>Plus haut ({peak.cycleNumber})</span>
          <span className={styles.historyStatValue}>{currencyFormatter.format(peak.netWorth)}</span>
        </div>
        <div className={styles.historyStat}>
          <span className={styles.historyStatLabel}>Aujourd'hui (cycle {last.cycleNumber})</span>
          <span className={styles.historyStatValue}>{currencyFormatter.format(last.netWorth)}</span>
        </div>
      </div>
    </section>
  );
}

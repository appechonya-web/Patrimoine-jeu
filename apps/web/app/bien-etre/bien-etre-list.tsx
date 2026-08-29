"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { PersonalAxis } from "@patrimoine-jeu/domain";
import type { PersonalActionView, PersonalAxisView, PersonalOverview, WellbeingCycleLine } from "../../lib/session";
import { GameError, investPersonal, performPersonalAction } from "../../lib/game-client";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import { StatHint } from "../stat-hint";
import styles from "../page.module.css";

function cooldownLabel(cyclesRemaining: number): string {
  return `Disponible dans ${cyclesRemaining} cycle${cyclesRemaining > 1 ? "s" : ""}`;
}

function AxisCard({ axis, onDone }: { axis: PersonalAxisView; onDone: () => void }) {
  const [amount, setAmount] = useState(50);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await investPersonal(axis.axis as PersonalAxis, amount);
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
        <div className={styles.jobTitle}>{axis.label}</div>
        <div className={styles.jobMeta}>{axis.description}</div>
        <div className={styles.meter}>
          <div className={styles.meterHeader}>
            <span>Niveau</span>
            <span>{axis.level.toFixed(0)}/100</span>
          </div>
          <div className={`${styles.meterTrack} ${styles.meterTrackWellbeing}`}>
            <div className={`${styles.meterFill} ${styles.meterFillWellbeing}`} style={{ width: `${axis.level}%` }} />
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        {axis.available ? (
          <form noValidate className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.formInput}
              type="number"
              min={20}
              max={200}
              step={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <button className={styles.apply} type="submit" disabled={pending}>
              {pending ? "…" : "Investir"}
            </button>
          </form>
        ) : (
          <span className={styles.jobMeta}>{cooldownLabel(axis.cyclesRemaining)}</span>
        )}
      </div>
    </div>
  );
}

function ActionCard({ action, onDone }: { action: PersonalActionView; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      await performPersonalAction(action.id);
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
        <div className={styles.jobTitle}>{action.label}</div>
        <div className={styles.jobMeta}>{action.description}</div>
        <div className={styles.jobStats}>
          <span>
            <StatHint hint="Boost immédiat et ponctuel — n'améliore pas durablement ta formule de bien-être comme un axe permanent (sport, nutrition, social, confort) le ferait.">
              💗 Bien-être +{action.wellbeingBoost}
            </StatHint>
          </span>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(action.cost)}</div>
        <button className={styles.apply} type="button" disabled={!action.available || pending} onClick={handleClick}>
          {pending ? "…" : action.available ? "Faire" : cooldownLabel(action.cyclesRemaining)}
        </button>
      </div>
    </div>
  );
}

function wellbeingZoneLabel(wellbeing: number): string {
  if (wellbeing >= 70) return "épanoui, léger bonus de revenu";
  if (wellbeing < 30) return "burnout, malus de revenu";
  return "neutre";
}

function WellbeingLineRow({ line }: { line: WellbeingCycleLine }) {
  return (
    <div className={styles.wealthLegendItem}>
      <span className={styles.wealthLegendLabel}>{line.label}</span>
      <span
        className={styles.wealthLegendValue}
        style={{ color: line.delta >= 0 ? "var(--wellbeing)" : "var(--danger)" }}
      >
        {line.delta >= 0 ? "+" : ""}
        {line.delta.toFixed(2)}
      </span>
    </div>
  );
}

function WellbeingSummary({ overview, wellbeingCycleLines }: { overview: PersonalOverview; wellbeingCycleLines: WellbeingCycleLine[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="💗"
          title="Bien-être"
          mechanic="Descend avec la pression au travail, l'activité d'indépendant et la gestion d'entreprises sans manager ; remonte passivement chaque cycle (accéléré par le levier Sport) et avec les biens de consommation possédés. Sous 30/100, un malus de revenu s'applique (jusqu'à -25%) ; au-dessus de 70/100, un bonus (jusqu'à +10%)."
          realWorld="C'est un vrai résultat de recherche en santé au travail : le burnout réduit concrètement la performance professionnelle, tandis qu'un bon équilibre de vie l'améliore."
        />
        <span>Bien-être : {overview.wellbeing.toFixed(0)}/100 ({wellbeingZoneLabel(overview.wellbeing)})</span>
      </h2>
      <div className={`${styles.meterTrack} ${styles.meterTrackWellbeing}`}>
        <div className={`${styles.meterFill} ${styles.meterFillWellbeing}`} style={{ width: `${overview.wellbeing}%` }} />
      </div>
      {wellbeingCycleLines.length > 0 && (
        <>
          <p className={styles.jobMeta} style={{ marginTop: "0.9rem" }}>
            Détail du dernier cycle — d'où vient et où part le bien-être :
          </p>
          <div className={styles.wealthLegend}>
            {wellbeingCycleLines.map((line) => (
              <WellbeingLineRow key={`${line.category}:${line.sourceId}`} line={line} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function PersonalOverviewList({
  overview,
  wellbeingCycleLines,
}: {
  overview: PersonalOverview;
  wellbeingCycleLines: WellbeingCycleLine[];
}) {
  const router = useRouter();

  function handleDone() {
    router.refresh();
  }

  return (
    <>
      <WellbeingSummary overview={overview} wellbeingCycleLines={wellbeingCycleLines} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="📈"
            title="Axes permanents"
            mechanic="Quatre leviers indépendants (sport, nutrition, social, confort) qui modulent durablement une formule de bien-être différente chacun — sport accélère la régénération passive, nutrition réduit la fatigue au travail, social élargit la zone de bonus de revenu, confort amortit le malus de burnout. Plafonné à une action par semaine, comme les leviers d'entreprise. Au-delà de 100/100, continuer d'investir rapporte un bonus de « palier mondial » en rendements décroissants (pas de mur) — utile si tu es assis sur des millions et que les leviers classiques ne suffisent plus à les faire progresser."
            realWorld="C'est le même principe que les leviers d'entreprise, à l'échelle personnelle : rendements décroissants (les premiers euros investis comptent plus), un vrai engagement dans la durée plutôt qu'un raccourci — comme changer durablement son hygiène de vie."
          />
          <span>Axes permanents</span>
        </h2>
        <p className={styles.subtitle}>
          Chaque axe module durablement une formule de bien-être — un investissement par semaine maximum, comme pour
          les leviers d'entreprise.
        </p>
        <div className={styles.jobList}>
          {overview.axes.map((axis) => (
            <AxisCard key={axis.axis} axis={axis} onDone={handleDone} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🎁"
            title="Actions ponctuelles"
            mechanic="Un boost immédiat et temporaire de bien-être contre de l'argent — chaque action a son propre cooldown, mais l'effet n'est pas permanent comme les axes ci-dessus."
            realWorld="C'est l'équivalent d'un vrai plaisir ponctuel (sortie, week-end, soin) : ça fait du bien tout de suite, mais ça ne change rien structurellement à ton équilibre de vie sur la durée, contrairement à un vrai changement d'habitude."
          />
          <span>Actions ponctuelles</span>
        </h2>
        <p className={styles.subtitle}>Un boost immédiat de bien-être, contre de l'argent — chacune a son propre cooldown.</p>
        <div className={styles.jobList}>
          {overview.actions.map((action) => (
            <ActionCard key={action.id} action={action} onDone={handleDone} />
          ))}
        </div>
      </section>
    </>
  );
}

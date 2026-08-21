"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AchievementView, DailyBonusStatus } from "../lib/session";
import { GameError, claimDailyBonus } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function DailyBonusCard({ status }: { status: DailyBonusStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleClaim() {
    setError(null);
    setPending(true);
    try {
      const result = await claimDailyBonus();
      setNotice(`+${currencyFormatter.format(result.reward)} — série de ${result.streak} jour${result.streak > 1 ? "s" : ""}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>🔥 Bonus de connexion</div>
        <div className={styles.jobMeta}>
          Série actuelle : {status.streak} jour{status.streak > 1 ? "s" : ""} d'affilée — reviens chaque jour pour la
          faire grandir.
        </div>
        {notice && <p className={styles.jobMeta}>{notice}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(status.nextReward)}</div>
        <button className={styles.apply} type="button" disabled={status.claimedToday || pending} onClick={handleClaim}>
          {pending ? "…" : status.claimedToday ? "✅ Réclamé aujourd'hui" : "Réclamer"}
        </button>
      </div>
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementView }) {
  return (
    <div className={styles.jobCard}>
      <div>
        <div className={styles.jobTitle}>
          {achievement.unlocked ? "🏅" : "🔒"} {achievement.label}
        </div>
        <div className={styles.jobMeta}>{achievement.description}</div>
      </div>
      <div className={styles.jobActions}>
        <div className={styles.jobSalary}>{currencyFormatter.format(achievement.reward)}</div>
      </div>
    </div>
  );
}

export function EngagementSection({
  dailyBonus,
  achievements,
}: {
  dailyBonus: DailyBonusStatus | null;
  achievements: AchievementView[];
}) {
  const [expanded, setExpanded] = useState(false);
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🎯"
          title="Défis & bonus"
          mechanic="Le bonus quotidien grandit avec ta série de connexions consécutives (jusqu'à un plafond au bout d'une semaine) — rater un jour la remet à zéro. Les défis, eux, sont des paliers ponctuels ou cumulatifs (premières fois, patrimoine net, profit d'entreprise, niveau de levier) qui rapportent une fois pour toutes."
          realWorld="Le bonus de série s'inspire des mécaniques de fidélisation classiques (comme un compte qui verse plus d'intérêt à la régularité) ; les défis cumulatifs, eux, reflètent de vrais jalons patrimoniaux — le genre de seuils qu'un conseiller financier suivrait pour mesurer ta progression réelle."
        />
        <span>Défis & bonus</span>
      </h2>
      {dailyBonus && <DailyBonusCard status={dailyBonus} />}
      <button
        type="button"
        className={styles.collapsibleToggle}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          🏅 Défis ({unlockedCount}/{achievements.length} débloqués)
        </span>
        <span className={`${styles.collapsibleChevron} ${expanded ? styles.collapsibleChevronOpen : ""}`}>▾</span>
      </button>
      {expanded && (
        <div className={styles.jobList} style={{ marginTop: "0.75rem" }}>
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </section>
  );
}

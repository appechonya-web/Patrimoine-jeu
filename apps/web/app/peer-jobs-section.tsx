"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { JobPostingView } from "../lib/session";
import { GameError, applyToJobPosting } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import { StatHint } from "./stat-hint";
import styles from "./page.module.css";

export function PeerJobsSection({ postings }: { postings: JobPostingView[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (postings.length === 0) return null;

  async function handleApply(postingId: string) {
    setError(null);
    setPendingId(postingId);
    try {
      await applyToJobPosting(postingId);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🧑‍💼"
          title="Offres d'emploi entre joueurs"
          mechanic="Comme un emploi NPC, mais le salaire est payé depuis la trésorerie réelle de l'entreprise employeuse — si elle manque de liquidités un cycle donné, tous ses employés-joueurs sont licenciés d'un coup ce cycle-là."
          realWorld="C'est le risque réel de travailler pour une petite entreprise plutôt qu'une administration ou une grande structure : ton salaire dépend directement de la santé financière de ton employeur, pas d'un budget garanti."
          tip="Avant de postuler, jette un œil à l'entreprise (onglet Finance) — une trésorerie très basse est un signal que ton salaire pourrait ne pas tenir longtemps."
        />
        <span>Offres d'emploi entre joueurs</span>
      </h2>
      <p className={styles.jobMeta}>Travaille pour l'entreprise d'un autre joueur — salaire réel versé depuis sa trésorerie.</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.jobList}>
        {postings.map((posting) => (
          <div key={posting.id} className={styles.jobCard}>
            <div>
              <div className={styles.jobTitle}>{posting.role}</div>
              <div className={styles.jobMeta}>
                <Link href={`/companies/${posting.company.id}`}>{posting.company.name}</Link> — {posting.company.sector} —{" "}
                {posting.company.municipality}
              </div>
              <div className={styles.jobStats}>
                <span>
                  <StatHint hint="Draine ton bien-être à chaque cycle travaillé, atténué par ton expérience dans ce secteur (qui augmente ta tolérance avec le temps).">
                    🔥 Pression {posting.pressure}/100
                  </StatHint>
                </span>
              </div>
            </div>
            <div className={styles.jobActions}>
              <div className={styles.jobSalary}>
                {currencyFormatter.format(posting.salaryPerCycle)}
                <span className={styles.jobMeta}> / cycle brut</span>
              </div>
              <button
                className={styles.apply}
                type="button"
                disabled={pendingId !== null}
                onClick={() => handleApply(posting.id)}
              >
                {pendingId === posting.id ? "…" : "Postuler"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

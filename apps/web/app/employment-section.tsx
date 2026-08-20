"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmploymentView, JobOffer } from "../lib/session";
import { GameError, quitJob, takeJob } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function EmploymentInfoTip() {
  return (
    <InfoTip
      label="💼"
      title="Emploi"
      mechanic="Un seul emploi actif à la fois — le salaire est versé automatiquement à chaque clôture de cycle, sans action de ta part. La pression du poste draine ton bien-être chaque cycle (atténuée par ton expérience dans ce secteur, qui augmente ta tolérance avec le temps), et ton revenu net varie avec ton multiplicateur bien-être (bonus si épanoui, malus en burnout)."
      realWorld="C'est le revenu salarié classique : régulier et prévisible, mais qui use une ressource personnelle (le stress, l'usure) proportionnellement à l'intensité du poste — un vrai arbitrage entre salaire élevé et soutenabilité à long terme, comme dans la vraie vie professionnelle."
      tip="Changer de secteur d'activité coûte une pénalité de bien-être ponctuelle (jusqu'à 8 points), qui diminue avec ton expérience dans le NOUVEAU secteur — mieux vaut ne pas changer de métier trop souvent au début."
    />
  );
}

function JobStats({
  pressure,
  reputationPerCycle,
  wellbeingDrainPerCycle,
  sectorExperienceCycles,
}: {
  pressure: number;
  reputationPerCycle: number;
  wellbeingDrainPerCycle: number;
  sectorExperienceCycles: number;
}) {
  const wellbeingSign = wellbeingDrainPerCycle > 0 ? "−" : "+";
  const wellbeingLabel = `Bien-être ${wellbeingSign}${Math.abs(wellbeingDrainPerCycle).toFixed(1)}/cycle`;

  return (
    <div className={styles.jobStats}>
      <span>🔥 Pression {pressure}/100</span>
      <span>💗 {wellbeingLabel}</span>
      {reputationPerCycle > 0 && <span>⭐ Réputation +{reputationPerCycle}/cycle</span>}
      {sectorExperienceCycles > 0 && <span>📈 XP secteur : {sectorExperienceCycles} cycles</span>}
    </div>
  );
}

export function EmploymentSection({
  employment,
  jobs,
}: {
  employment: EmploymentView | null;
  jobs: JobOffer[];
}) {
  const router = useRouter();
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [quitting, setQuitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleApply(job: JobOffer) {
    setError(null);
    setNotice(null);
    setPendingJobId(job.id);
    try {
      const result = await takeJob(job.id);
      if (result.reconversionPenalty > 0) {
        setNotice(
          `Reconversion vers ${job.sector} : -${result.reconversionPenalty.toFixed(1)} bien-être (changement de secteur).`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPendingJobId(null);
    }
  }

  async function handleQuit() {
    setError(null);
    setQuitting(true);
    try {
      await quitJob();
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setQuitting(false);
    }
  }

  if (employment) {
    return (
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <EmploymentInfoTip />
          <span>Emploi</span>
        </h2>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.jobCard}>
          <div>
            <div className={styles.jobTitle}>{employment.role}</div>
            <div className={styles.jobMeta}>
              {employment.employerCompanyName ? `Employé chez ${employment.employerCompanyName} — ` : ""}
              {employment.sector} — depuis le cycle n°{employment.startedCycle}
            </div>
            {employment.pressure !== null && (
              <JobStats
                pressure={employment.pressure}
                reputationPerCycle={employment.reputationPerCycle ?? 0}
                wellbeingDrainPerCycle={employment.estimatedWellbeingDrainPerCycle}
                sectorExperienceCycles={employment.sectorExperienceCycles}
              />
            )}
          </div>
          <div className={styles.jobActions}>
            <div className={styles.jobSalary}>
              {currencyFormatter.format(employment.estimatedNetPerCycle)}
              <span className={styles.jobMeta}> / cycle net</span>
            </div>
            <button className={styles.logout} type="button" disabled={quitting} onClick={handleQuit}>
              {quitting ? "…" : "Démissionner"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <EmploymentInfoTip />
        <span>Offres d'emploi</span>
      </h2>
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.jobMeta}>{notice}</p>}
      <div className={styles.jobList}>
        {jobs.map((job) => (
          <div key={job.id} className={styles.jobCard}>
            <div>
              <div className={styles.jobTitle}>{job.title}</div>
              <div className={styles.jobMeta}>{job.sector}</div>
              <JobStats
                pressure={job.pressure}
                reputationPerCycle={job.reputationPerCycle}
                wellbeingDrainPerCycle={job.estimatedWellbeingDrainPerCycle}
                sectorExperienceCycles={job.sectorExperienceCycles}
              />
              {job.reconversionPenalty > 0 && (
                <div className={styles.jobWarning}>
                  ⚠ Changement de secteur : -{job.reconversionPenalty.toFixed(1)} bien-être une fois
                </div>
              )}
            </div>
            <div className={styles.jobActions}>
              <div className={styles.jobSalary}>
                {currencyFormatter.format(job.estimatedNetPerCycle)}
                <span className={styles.jobMeta}> / cycle net</span>
              </div>
              <button
                className={styles.apply}
                type="button"
                disabled={pendingJobId !== null}
                onClick={() => handleApply(job)}
              >
                {pendingJobId === job.id ? "…" : "Postuler"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

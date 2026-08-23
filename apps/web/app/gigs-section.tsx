"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GigView } from "../lib/session";
import { GameError, performGig } from "../lib/game-client";
import { currencyFormatter } from "../lib/format";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function cooldownLabel(secondsRemaining: number): string {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `Disponible dans ${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GigsSection({ gigs }: { gigs: GigView[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [remainingByGig, setRemainingByGig] = useState<Record<string, number>>(() =>
    Object.fromEntries(gigs.map((gig) => [gig.id, gig.secondsRemaining])),
  );

  useEffect(() => {
    setRemainingByGig(Object.fromEntries(gigs.map((gig) => [gig.id, gig.secondsRemaining])));
  }, [gigs]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingByGig((current) => {
        const next: Record<string, number> = {};
        for (const [id, seconds] of Object.entries(current)) {
          next[id] = Math.max(0, seconds - 1);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handlePerform(gig: GigView) {
    setError(null);
    setNotice(null);
    setPendingId(gig.id);
    try {
      const result = await performGig(gig.id);
      setNotice(`${gig.label} : +${currencyFormatter.format(result.reward)}`);
      setRemainingByGig((current) => ({ ...current, [gig.id]: gig.cooldownSeconds }));
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPendingId(null);
    }
  }

  if (gigs.length === 0) return null;

  return (
    <section id="petits-boulots" className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="🧰"
          title="Petits boulots"
          mechanic="Revenu immédiat, cumulable avec un emploi — chaque petit boulot a son propre cooldown compté en temps réel (pas en cycles de jeu), pour rester utile dès la première session sans attendre une clôture de cycle."
          realWorld="C'est l'équivalent d'un job d'appoint ou de plateforme (livraison, petites annonces) : rapide à démarrer, sans engagement, mais avec un plafond de revenu naturel puisqu'il faut être actif pour en profiter — contrairement à un salaire qui tombe tout seul."
          tip="Le petit boulot le mieux payé par minute d'attente n'est pas toujours celui qui rapporte le plus en une fois — regarde le ratio récompense/cooldown, pas juste le montant affiché."
        />
        <span>Petits boulots</span>
      </h2>
      <p className={styles.subtitle}>Un revenu d'appoint immédiat, cumulable avec ton emploi — utile surtout au début.</p>
      {error && <p className={styles.error}>{error}</p>}
      {notice && <p className={styles.jobMeta}>{notice}</p>}
      <div className={styles.jobList}>
        {gigs.map((gig) => {
          const secondsRemaining = remainingByGig[gig.id] ?? gig.secondsRemaining;
          const available = gig.unlocked && secondsRemaining <= 0;
          return (
            <div key={gig.id} className={styles.jobCard}>
              <div>
                <div className={styles.jobTitle}>{gig.label}</div>
                <div className={styles.jobMeta}>{gig.description}</div>
                <div className={styles.jobStats}>
                  <span>
                    💵 {currencyFormatter.format(gig.minReward)} – {currencyFormatter.format(gig.maxReward)}
                  </span>
                  {gig.wellbeingCost > 0 && <span>💗 Bien-être −{gig.wellbeingCost}</span>}
                  {!gig.unlocked && <span>🔒 Réputation min. {gig.minReputation}</span>}
                </div>
              </div>
              <div className={styles.jobActions}>
                <button
                  className={styles.apply}
                  type="button"
                  disabled={!available || pendingId !== null}
                  onClick={() => handlePerform(gig)}
                >
                  {pendingId === gig.id
                    ? "…"
                    : available
                      ? "Faire ce petit boulot"
                      : !gig.unlocked
                        ? `🔒 Réputation insuffisante`
                        : cooldownLabel(secondsRemaining)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

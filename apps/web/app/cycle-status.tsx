"use client";

import { useEffect, useState } from "react";
import { CYCLES_PER_YEAR } from "@patrimoine-jeu/domain";
import type { CurrentCycle } from "../lib/session";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "clôture imminente…";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function CycleStatus({ cycle }: { cycle: CurrentCycle | null }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [cycle?.closesAt]);

  const closesAtMs = cycle ? new Date(cycle.closesAt).getTime() : null;
  const remainingMs = now !== null && closesAtMs !== null ? closesAtMs - now : null;
  const durationMinutes = cycle ? Math.round(cycle.durationMs / 60000) : null;

  const cycleInYear = cycle ? ((cycle.number - 1) % CYCLES_PER_YEAR) + 1 : null;
  const gameYear = cycle ? Math.floor((cycle.number - 1) / CYCLES_PER_YEAR) + 1 : null;

  return (
    <section className={styles.cycleBar}>
      <span>
        <InfoTip
          label="⏳"
          title="Cycle de jeu"
          mechanic={`Un cycle dure ${durationMinutes ?? 30} minutes réelles avant de se clôturer automatiquement — c'est à ce moment que salaires, loyers, intérêts, impôts, résultats d'entreprise et événements aléatoires sont tous calculés d'un coup, sans action de ta part. ${CYCLES_PER_YEAR} cycles composent une année de jeu (le rythme utilisé pour annualiser salaires et impôts).`}
          realWorld="C'est l'équivalent d'une clôture comptable périodique (comme un exercice fiscal) : tout ce qui s'est accumulé pendant la période — revenus, charges, intérêts — est réglé en une fois plutôt qu'en continu."
        />{" "}
        Cycle n°{cycle?.number ?? "—"}
        {cycleInYear !== null && gameYear !== null && (
          <span className={styles.jobMeta}>
            {" "}
            — jour {cycleInYear}/{CYCLES_PER_YEAR} de l'année {gameYear}
          </span>
        )}
      </span>
      <span className={styles.jobMeta}>
        {remainingMs !== null ? `⏱️ Prochaine clôture dans ${formatCountdown(remainingMs)}` : "…"} — loyers, salaires et
        impôts sont traités par le serveur
      </span>
    </section>
  );
}

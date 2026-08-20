import type { CurrentCycle } from "../lib/session";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

export function CycleStatus({ cycle }: { cycle: CurrentCycle | null }) {
  return (
    <section className={styles.cycleBar}>
      <span>
        <InfoTip
          label="⏳"
          title="Cycle de jeu"
          mechanic="Un cycle se clôture automatiquement toutes les heures réelles — c'est à ce moment que salaires, loyers, intérêts, impôts, résultats d'entreprise et événements aléatoires sont tous calculés d'un coup, sans action de ta part."
          realWorld="C'est l'équivalent d'une clôture comptable périodique (comme un exercice fiscal) : tout ce qui s'est accumulé pendant la période — revenus, charges, intérêts — est réglé en une fois plutôt qu'en continu."
        />{" "}
        Cycle n°{cycle?.number ?? "—"}
      </span>
      <span className={styles.jobMeta}>Clôture automatique — loyers, salaires et impôts sont traités par le serveur</span>
    </section>
  );
}

"use client";

import { useHelp } from "../lib/help-context";
import styles from "./page.module.css";

export function HelpToggle() {
  const { enabled, toggle } = useHelp();

  return (
    <button
      type="button"
      className={styles.helpToggle}
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Désactiver les explications au survol des icônes" : "Activer les explications au survol des icônes"}
    >
      {enabled ? "❓ Aide activée" : "❔ Aide désactivée"}
    </button>
  );
}

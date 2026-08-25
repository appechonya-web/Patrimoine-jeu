"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useHelp } from "../lib/help-context";
import styles from "./page.module.css";

/**
 * Version compacte d'InfoTip pour les petites statistiques en ligne (les
 * "pills" de styles.jobStats) — une seule phrase au survol, sans la
 * structure titre/mécanique/vrai monde/astuce, pour ne pas alourdir des
 * listes qui affichent déjà beaucoup de chiffres côte à côte.
 */
export function StatHint({ children, hint }: { children: ReactNode; hint: ReactNode }) {
  const { enabled } = useHelp();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!enabled) return <>{children}</>;

  return (
    <span ref={rootRef} className={styles.statHint} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={styles.statHintTrigger}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={(event) => {
          // Souvent utilisé à l'intérieur d'une carte cliquable (Link) — ne
          // doit jamais déclencher la navigation de la carte, juste basculer
          // la bulle d'aide.
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onFocus={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <span role="tooltip" id={popoverId} className={styles.statHintPopover}>
          {hint}
        </span>
      )}
    </span>
  );
}

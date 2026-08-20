"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useHelp } from "../lib/help-context";
import styles from "./page.module.css";

export function InfoTip({
  label,
  title,
  mechanic,
  realWorld,
  tip,
}: {
  /** Le déclencheur affiché (généralement l'icône déjà utilisée dans le titre de section). */
  label: ReactNode;
  title: string;
  /** "Dans le jeu" — comment fonctionne ce mécanisme précisément dans cette partie. */
  mechanic: ReactNode;
  /** "Dans la vraie vie" — le parallèle réel (fiscalité belge, finance, économie) dont le mécanisme s'inspire. */
  realWorld: ReactNode;
  /** Astuce facultative — un conseil pratique quand un joueur pourrait s'y prendre mal. */
  tip?: ReactNode;
}) {
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

  if (!enabled) return <>{label}</>;

  return (
    <span ref={rootRef} className={styles.infoTip} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={styles.infoTipTrigger}
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <span role="tooltip" id={popoverId} className={styles.infoTipPopover}>
          <span className={styles.infoTipTitle}>{title}</span>
          <span className={styles.infoTipLabel}>🎮 Dans le jeu</span>
          <span className={styles.infoTipBody}>{mechanic}</span>
          <span className={styles.infoTipLabel}>🌍 Dans la vraie vie</span>
          <span className={styles.infoTipBody}>{realWorld}</span>
          {tip && (
            <span className={styles.infoTipTipBox}>
              <strong>💡 Astuce —</strong> {tip}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

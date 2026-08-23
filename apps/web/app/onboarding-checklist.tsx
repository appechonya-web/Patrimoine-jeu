"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AchievementView } from "../lib/session";
import styles from "./page.module.css";

const DISMISS_KEY = "onboarding-dismissed";

/**
 * Réutilise les défis "premières fois" déjà trackés par le système de
 * défis (cf. domain/achievements.ts) — pas de nouvel état côté serveur,
 * juste un ordre et des liens pensés pour un tout premier passage sur le
 * jeu plutôt que l'ordre alphabétique du catalogue.
 */
const ONBOARDING_STEPS: { achievementId: string; label: string; href: string }[] = [
  { achievementId: "first-job", label: "Prendre un premier emploi", href: "#emploi" },
  { achievementId: "first-savings", label: "Ouvrir un compte d'épargne", href: "/epargne" },
  { achievementId: "first-quiz", label: "Répondre au quiz fiscal", href: "#quiz" },
  { achievementId: "first-gig", label: "Décrocher un petit boulot", href: "#petits-boulots" },
  { achievementId: "first-asset-trade", label: "Faire un premier placement", href: "/placements" },
  { achievementId: "first-property", label: "Devenir propriétaire", href: "/immobilier" },
  { achievementId: "first-company", label: "Fonder une entreprise", href: "#entreprises" },
  { achievementId: "first-donation", label: "Faire un premier don", href: "/dons" },
];

export function OnboardingChecklist({ achievements }: { achievements: AchievementView[] }) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setMounted(true);
  }, []);

  const unlockedById = new Map(achievements.map((achievement) => [achievement.id, achievement.unlocked]));
  const steps = ONBOARDING_STEPS.map((step) => ({ ...step, done: unlockedById.get(step.achievementId) ?? false }));
  const doneCount = steps.filter((step) => step.done).length;

  if (!mounted || dismissed || doneCount === steps.length) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <section className={styles.section}>
      <div className={styles.onboardingHeader}>
        <h2 className={styles.sectionTitle}>
          <span>🧭 Premiers pas ({doneCount}/{steps.length})</span>
        </h2>
        <button type="button" className={styles.onboardingDismiss} onClick={handleDismiss}>
          Masquer
        </button>
      </div>
      <p className={styles.jobMeta}>
        De quoi découvrir les bases du jeu — dans l'ordre que tu veux, chaque étape rapporte aussi un défi.
      </p>
      <div className={styles.onboardingSteps}>
        {steps.map((step) => (
          <Link
            key={step.achievementId}
            href={step.href}
            className={`${styles.onboardingStep} ${step.done ? styles.onboardingStepDone : ""}`}
          >
            <span>{step.done ? "✅" : "◻️"}</span>
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOutboxEntry } from "../../lib/session";
import { GameError, setEmailAlertsPreference } from "../../lib/game-client";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export function EmailAlertsSection({ enabled, outbox }: { enabled: boolean; outbox: EmailOutboxEntry[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setError(null);
    setPending(true);
    try {
      await setEmailAlertsPreference(!enabled);
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>
        <InfoTip
          label="📧"
          title="Alerte mail"
          mechanic="Ne se déclenche que pour les événements urgents nécessitant une action rapide (défaut de paiement, saisie, fin d'enchère, offre en attente) — pas les nouvelles ordinaires, pour rester vraiment utile plutôt que noyer sous les notifications."
          realWorld="Aucun email n'est réellement envoyé (le jeu n'a pas de service d'envoi configuré) — la 'boîte d'envoi simulée' ci-dessous montre honnêtement ce qui aurait été envoyé, plutôt que de simuler une fausse intégration."
        />
        <span>Alerte mail</span>
      </h2>
      <p className={styles.jobMeta}>
        Volontairement rare — réservée aux événements graves (défaut de paiement, saisie, enchère qui se termine,
        offre en attente). Aucun email n'est réellement envoyé pour l'instant ; active l'option pour voir ci-dessous
        ce qui aurait été envoyé.
      </p>
      {error && <p className={styles.error}>{error}</p>}
      <button className={enabled ? styles.logout : styles.apply} type="button" disabled={pending} onClick={handleToggle}>
        {pending ? "…" : enabled ? "🔕 Désactiver l'alerte mail" : "🔔 Activer l'alerte mail"}
      </button>

      {enabled && (
        <>
          <h3 className={styles.jobMeta}>Boîte d'envoi simulée</h3>
          {outbox.length === 0 ? (
            <p className={styles.jobMeta}>Aucune alerte urgente pour l'instant.</p>
          ) : (
            <div className={styles.jobList}>
              {outbox.map((entry) => (
                <div key={entry.id} className={styles.jobCard}>
                  <div>
                    <div className={styles.jobTitle}>{entry.subject}</div>
                    <div className={styles.jobMeta}>
                      Cycle n°{entry.cycle} — {new Date(entry.sentAt).toLocaleString("fr-BE")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

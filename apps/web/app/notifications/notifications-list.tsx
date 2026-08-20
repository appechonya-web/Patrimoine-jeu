"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOTIFICATION_ICONS, type NotificationType } from "@patrimoine-jeu/domain";
import type { NotificationView } from "../../lib/session";
import { GameError, markNotificationsRead } from "../../lib/game-client";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

function NotificationRow({ notification }: { notification: NotificationView }) {
  const icon = NOTIFICATION_ICONS[notification.type as NotificationType] ?? "🔔";

  return (
    <div className={`${styles.jobCard} ${notification.read ? "" : styles.jobCardMe}`}>
      <div>
        <div className={styles.jobTitle}>
          {icon} {notification.message}
        </div>
        <div className={styles.jobMeta}>
          Cycle n°{notification.cycle} — {new Date(notification.createdAt).toLocaleString("fr-BE")}
        </div>
      </div>
    </div>
  );
}

export function NotificationsList({ notifications, unreadCount }: { notifications: NotificationView[]; unreadCount: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleMarkAllRead() {
    setError(null);
    setPending(true);
    try {
      await markNotificationsRead();
      router.refresh();
    } catch (err) {
      setError(err instanceof GameError ? err.message : "Une erreur est survenue");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🔔"
            title="Journal"
            mechanic="Toutes les notifications générées par tes actions et celles qui te concernent (faillites, défauts de paiement, ventes, faits divers) — un historique complet, pas juste les alertes urgentes."
            realWorld="C'est ton relevé d'activité complet, comme l'historique de transactions d'un compte bancaire : chaque ligne correspond à un événement réel qui a affecté ton patrimoine ou tes affaires."
          />
          <span>Journal</span>
        </h2>
        {unreadCount > 0 && (
          <button className={styles.logout} type="button" disabled={pending} onClick={handleMarkAllRead}>
            {pending ? "…" : `Tout marquer comme lu (${unreadCount})`}
          </button>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      {notifications.length === 0 ? (
        <p className={styles.jobMeta}>Rien à signaler pour l'instant.</p>
      ) : (
        <div className={styles.jobList}>
          {notifications.map((notification) => (
            <NotificationRow key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </section>
  );
}

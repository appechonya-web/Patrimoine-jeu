import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCurrentPlayer,
  getDigest,
  getEmailAlertsPreference,
  getEmailOutbox,
  getNotifications,
} from "../../lib/session";
import { NotificationsList } from "./notifications-list";
import { EmailAlertsSection } from "./email-alerts-section";
import { DigestSection } from "./digest-section";
import styles from "../page.module.css";

export default async function NotificationsPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [{ notifications, unreadCount }, emailAlerts, outbox, digest] = await Promise.all([
    getNotifications(100),
    getEmailAlertsPreference(),
    getEmailOutbox(),
    getDigest(),
  ]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🔔 Journal</h1>
          <p className={styles.subtitle}>Les événements marquants qui te sont arrivés — aléas d'entreprise, défauts de paiement, saisies...</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <EmailAlertsSection enabled={emailAlerts.enabled} outbox={outbox} />

      <DigestSection periods={digest} />

      <NotificationsList notifications={notifications} unreadCount={unreadCount} />
    </main>
  );
}

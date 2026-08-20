import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getPensionSavingsStatus, getSavingsAccounts } from "../../lib/session";
import { SavingsList } from "./savings-list";
import styles from "../page.module.css";

export default async function EpargnePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [accounts, pensionStatus] = await Promise.all([getSavingsAccounts(), getPensionSavingsStatus()]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🐷 Épargne</h1>
          <p className={styles.subtitle}>
            Livret liquide, compte à terme bloqué mais mieux rémunéré, épargne-pension aux intérêts exonérés — trois
            façons de placer ton argent en dehors de la bourse, l'immobilier ou tes entreprises.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <SavingsList accounts={accounts} pensionStatus={pensionStatus} />
    </main>
  );
}

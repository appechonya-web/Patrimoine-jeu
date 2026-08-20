import { redirect } from "next/navigation";
import Link from "next/link";
import { getCauseDonationStatus, getCauses, getCurrentPlayer } from "../../lib/session";
import { DonationsList } from "./donations-list";
import styles from "../page.module.css";

export default async function DonsPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [causes, causeStatus] = await Promise.all([getCauses(), getCauseDonationStatus()]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🎁 Dons & mécénat</h1>
          <p className={styles.subtitle}>
            Un don à un autre joueur est taxé aux droits de donation "entre tiers" — le jeu ne modélise aucun lien
            de parenté, donc pas de taux réduit. Un don à une cause reconnue, lui, donne droit à une réduction
            d'impôt immédiate et n'est jamais taxé : légalement, donner à une cause coûte nettement moins cher que
            donner à un particulier.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <DonationsList causes={causes} causeStatus={causeStatus} />
    </main>
  );
}

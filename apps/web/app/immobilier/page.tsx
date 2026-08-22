import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getMyProperties, getPropertyMarket } from "../../lib/session";
import { PropertyMarketPageClient } from "./page-client";
import styles from "../page.module.css";

export default async function ImmobilierPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [listings, myProperties] = await Promise.all([getPropertyMarket(), getMyProperties()]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🏘️ Immobilier</h1>
          <p className={styles.subtitle}>
            Achète des biens par province, loue-les à des locataires pour un revenu passif, entretiens-les — négliger
            l'entretien réduit directement le loyer perçu.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <PropertyMarketPageClient listings={listings} myProperties={myProperties} />
    </main>
  );
}

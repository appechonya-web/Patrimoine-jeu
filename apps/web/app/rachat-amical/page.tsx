import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getSaleListings } from "../../lib/session";
import { SaleListingList } from "./sale-listing-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function RachatAmicalPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const listings = await getSaleListings();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🤝"
              title="Rachats amicaux"
              mechanic="Vue d'ensemble des annonces de vente négociées — contrairement à l'OPA hostile, chaque vendeur reçoit des offres privées et choisit librement laquelle accepter, sans prime minimale imposée."
              realWorld="L'équivalent d'un tableau d'annonces de cession de PME : négociation privée plutôt qu'appel d'offres public, le vendeur garde le contrôle total du processus."
            />{" "}
            Rachats amicaux
          </h1>
          <p className={styles.subtitle}>Annonces de vente négociées — propose ton offre, le vendeur choisit</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <SaleListingList listings={listings} />
    </main>
  );
}

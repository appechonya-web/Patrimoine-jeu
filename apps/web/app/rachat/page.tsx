import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getTenderOffers } from "../../lib/session";
import { TenderOfferList } from "./tender-offer-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function RachatPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const offers = await getTenderOffers();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="⚔️"
              title="Rachats hostiles (OPA)"
              mechanic="Vue d'ensemble de toutes les OPA en cours — un prix par 1% de parts, au moins 10% au-dessus de la valeur comptable, ouvert à TOUS les actionnaires d'une entreprise, pas seulement ceux qui voulaient vendre."
              realWorld="Le tableau de bord d'un raider financier : repérer les entreprises où une prime suffisante peut convaincre assez d'actionnaires de céder le contrôle, malgré l'opposition possible de la direction en place."
            />{" "}
            Rachats hostiles (OPA)
          </h1>
          <p className={styles.subtitle}>Offres publiques d'achat en cours sur les entreprises des joueurs</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <TenderOfferList offers={offers} myPseudo={player.pseudo} />
    </main>
  );
}

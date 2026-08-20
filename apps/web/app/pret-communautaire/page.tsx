import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getLoanOffers } from "../../lib/session";
import { LoanOfferList } from "./loan-offer-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function PretCommunautairePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const offers = await getLoanOffers();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🏦"
              title="Prêts entre joueurs"
              mechanic="Marché commun de toutes les offres de prêt publiées par les entreprises-joueurs — chaque prêteur fixe librement son taux et sa durée dans des bornes raisonnables, financés par sa propre trésorerie."
              realWorld="C'est une place de marché de prêt entre pairs (peer-to-peer lending) : les taux reflètent le risque perçu par chaque prêteur individuellement, pas un taux directeur fixé par une banque centrale."
            />{" "}
            Prêts entre joueurs
          </h1>
          <p className={styles.subtitle}>
            Des entreprises prêtent leur trésorerie à d'autres joueurs, à un taux fixé librement par leur
            actionnaire principal — pour proposer un prêt, ouvre le détail de ton entreprise.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <LoanOfferList offers={offers} />
    </main>
  );
}

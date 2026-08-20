import { redirect } from "next/navigation";
import Link from "next/link";
import { getCommodityMarkets, getCurrentPlayer } from "../../lib/session";
import { BourseList } from "./bourse-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function BoursePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const markets = await getCommodityMarkets();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="💹"
              title="Bourse des matières premières"
              mechanic="Marché automatisé (AMM) : le prix bouge mécaniquement selon les réserves du pool à chaque transaction, pas selon un carnet d'ordres — une grosse transaction fait bouger le prix plus qu'une petite, plafonnée à 30% de la réserve en un coup. Une petite commission s'applique à chaque échange."
              realWorld="C'est le même principe qu'un market maker automatisé (comme on en trouve en finance décentralisée) : pas d'acheteur/vendeur à apparier, le prix se recalcule directement depuis les réserves du pool à chaque ordre."
              tip="Une grosse vente d'un coup fait chuter le prix bien plus que la même quantité vendue en plusieurs fois — étale tes ordres si tu veux limiter l'impact sur le marché."
            />{" "}
            Bourse des matières premières
          </h1>
          <p className={styles.subtitle}>
            Marché à liquidité automatique — chaque achat fait monter le prix, chaque vente le fait baisser. La
            profondeur du marché grandit avec le nombre de joueurs.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <BourseList markets={markets} />
    </main>
  );
}

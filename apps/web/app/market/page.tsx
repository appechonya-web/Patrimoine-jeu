import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getMarketplace, getMyCompanies } from "../../lib/session";
import { MarketList } from "./market-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function MarketPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [listings, myCompanies] = await Promise.all([getMarketplace(), getMyCompanies()]);
  const myControlledCompanies = myCompanies.companies
    .filter((c) => c.sharePercentage > 50)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="📊"
              title="Marché des parts"
              mechanic="Achète des parts minoritaires d'entreprises mises en vente par d'autres joueurs — chaque vendeur fixe son propre prix, premier arrivé premier servi, pas d'enchère."
              realWorld="C'est un marché d'actions de gré à gré pour PME non cotées : contrairement à une bourse cotée avec cotation continue, ici les prix sont affichés par annonce, comme des petites annonces plutôt qu'un carnet d'ordres."
            />{" "}
            Marché des parts
          </h1>
          <p className={styles.subtitle}>Investis dans les entreprises des autres joueurs</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <MarketList listings={listings} myControlledCompanies={myControlledCompanies} />
    </main>
  );
}

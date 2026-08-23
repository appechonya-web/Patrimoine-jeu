import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCommodityMarkets,
  getCurrentPlayer,
  getFinancialAssets,
  getMyCompanies,
  getMyProperties,
  getPersonalGoods,
  getSavingsAccounts,
  getWealthBreakdown,
  getWealthHistory,
} from "../../lib/session";
import { WealthBreakdownSection } from "../wealth-breakdown-section";
import { WealthHistoryChart } from "../wealth-history-chart";
import { PortfolioSections } from "./portfolio-sections";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function PortefeuillePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [breakdown, history, assets, savings, myCompanies, properties, commodities, personalGoods] = await Promise.all([
    getWealthBreakdown(),
    getWealthHistory(),
    getFinancialAssets(),
    getSavingsAccounts(),
    getMyCompanies(),
    getMyProperties(),
    getCommodityMarkets(),
    getPersonalGoods(),
  ]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="💼"
              title="Portefeuille"
              mechanic="Toutes tes positions réelles, tous types de placements confondus — recalculées en direct, pas un instantané figé au dernier cycle. Le graphique en haut montre la répartition globale, chaque section en dessous liste le détail de ce qui la compose."
              realWorld="C'est l'équivalent d'un relevé de patrimoine global chez un vrai gestionnaire de fortune : au lieu de consulter séparément ton compte bancaire, ton courtier en bourse et ton notaire, tout est réuni au même endroit."
            />{" "}
            Portefeuille
          </h1>
          <p className={styles.subtitle}>Toutes tes positions, tous placements confondus, en un seul endroit.</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <WealthBreakdownSection breakdown={breakdown} />

      <WealthHistoryChart history={history} />

      <PortfolioSections
        assets={assets.filter((asset) => asset.quantity > 0)}
        savings={savings}
        companies={myCompanies.companies}
        properties={properties}
        commodities={commodities.filter((commodity) => commodity.myHolding > 0)}
        personalGoods={personalGoods.owned}
      />
    </main>
  );
}

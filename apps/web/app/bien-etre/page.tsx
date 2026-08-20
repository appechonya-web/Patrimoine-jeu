import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getPersonalGoods, getPersonalOverview } from "../../lib/session";
import { PersonalOverviewList } from "./bien-etre-list";
import { PersonalGoodsSection } from "./personal-goods-section";
import styles from "../page.module.css";

export default async function BienEtrePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [overview, personalGoods] = await Promise.all([getPersonalOverview(), getPersonalGoods()]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>💗 Bien-être personnel</h1>
          <p className={styles.subtitle}>
            Des axes d'amélioration permanents pour tenir sur la durée, et des actions ponctuelles pour un coup de
            boost immédiat.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <PersonalOverviewList overview={overview} />

      <PersonalGoodsSection overview={personalGoods} />
    </main>
  );
}

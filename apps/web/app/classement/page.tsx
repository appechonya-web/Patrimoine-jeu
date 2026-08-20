import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getLeaderboard } from "../../lib/session";
import { LeaderboardView } from "./leaderboard-view";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function ClassementPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const initialEntries = await getLeaderboard("networth", 30);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🏆"
              title="Classement"
              mechanic="Quatre métriques distinctes (patrimoine net, croissance récente, réputation, expérience) — bascule entre elles avec les onglets. La croissance se mesure sur une fenêtre de temps que tu choisis (7, 30 ou 90 cycles)."
              realWorld="Patrimoine net absolu et croissance relative racontent deux histoires différentes — être riche aujourd'hui n'est pas pareil que devenir riche vite, exactement comme un classement Forbes vs un ratio de performance boursière."
            />{" "}
            Classement
          </h1>
          <p className={styles.subtitle}>Patrimoine, croissance récente, réputation, expérience — où tu te situes.</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <LeaderboardView initialEntries={initialEntries} />
    </main>
  );
}

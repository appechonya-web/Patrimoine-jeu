import { redirect } from "next/navigation";
import Link from "next/link";
import { getCapitalRaises, getCurrentPlayer } from "../../lib/session";
import { CapitalRaiseList } from "./capital-raise-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function CapitalRisquePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const raises = await getCapitalRaises();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="💰"
              title="Capital-risque"
              mechanic="Vue d'ensemble des levées de fonds en cours — finance l'entreprise d'un autre joueur en échange de NOUVELLES parts émises, qui diluent mécaniquement tous les actionnaires existants au prorata."
              realWorld="Le tableau de bord d'un investisseur en capital-risque : repérer les entreprises qui cherchent du financement et juger si la dilution proposée pour les actionnaires actuels vaut le potentiel de l'entreprise."
            />{" "}
            Capital-risque
          </h1>
          <p className={styles.subtitle}>Finance l'entreprise d'un autre joueur en échange de nouvelles parts émises</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <CapitalRaiseList raises={raises} />
    </main>
  );
}

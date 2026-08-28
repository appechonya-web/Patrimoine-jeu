import { redirect } from "next/navigation";
import Link from "next/link";
import { getCapitalRaises, getCurrentPlayer, getMyCompanies } from "../../lib/session";
import { CapitalRaiseList } from "./capital-raise-list";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function CapitalRisquePage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [raises, myCompanies] = await Promise.all([getCapitalRaises(), getMyCompanies()]);
  const myControlledCompanies = myCompanies.companies
    .filter((c) => c.sharePercentage > 50)
    .map((c) => ({ id: c.id, name: c.name }));

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="💰"
              title="Capital-risque"
              mechanic="Vue d'ensemble des levées de fonds en cours — finance l'entreprise d'un autre joueur en échange de NOUVELLES parts émises, qui diluent mécaniquement tous les actionnaires existants au prorata. Plusieurs investisseurs peuvent se partager un même tour : ta part de nouvelles actions est proportionnelle à ta contribution par rapport au montant cible, pas une part égale entre investisseurs. Aucun rendement garanti : ton seul retour, c'est la valeur future de cette part (dividendes + revente), identique à n'importe quel actionnaire."
              realWorld="Le tableau de bord d'un investisseur en capital-risque : ancienneté, profit cumulé, trésorerie et attractivité sont ta due diligence avant de miser — une jeune entreprise en perte avec peu de trésorerie est un pari bien plus risqué qu'une entreprise établie et rentable, exactement comme en vrai capital-risque."
            />{" "}
            Capital-risque
          </h1>
          <p className={styles.subtitle}>Finance l'entreprise d'un autre joueur en échange de nouvelles parts émises</p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <CapitalRaiseList raises={raises} myControlledCompanies={myControlledCompanies} />
    </main>
  );
}

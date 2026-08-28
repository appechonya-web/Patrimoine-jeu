import { redirect } from "next/navigation";
import Link from "next/link";
import { PROVINCE_PROPERTY_PROFILES, PROVINCE_SECTOR_AFFINITIES } from "@patrimoine-jeu/domain";
import { getCurrentPlayer, getMunicipalities, getProvinceRanking } from "../../lib/session";
import { currencyFormatter } from "../../lib/format";
import { InfoTip } from "../info-tip";
import styles from "../page.module.css";

export default async function ProvincesPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [municipalities, ranking] = await Promise.all([getMunicipalities(), getProvinceRanking()]);
  const byRegion = new Map<string, typeof municipalities>();
  for (const m of municipalities) {
    const list = byRegion.get(m.region.name) ?? [];
    list.push(m);
    byRegion.set(m.region.name, list);
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>
            <InfoTip
              label="🏛️"
              title="Provinces"
              mechanic="Contribue au fonds d'infrastructure d'une province — le bénéfice (bonus d'attractivité, à rendement décroissant) profite à TOUTES les entreprises qui y sont installées, pas seulement toi. En échange, ton statut de contributeur est visible publiquement et tu pèses dans les votes du conseil provincial. Certaines provinces offrent aussi un bonus permanent aux entreprises dont le secteur y est historiquement ancré (ex. Métaux à Liège), indépendant de toute contribution."
              realWorld="C'est un vrai bien public local : comme des impôts communaux qui financent des routes ou des équipements dont profitent toutes les entreprises de la zone, avec le même problème du 'passager clandestin' — tu peux profiter du fonds sans y avoir contribué toi-même. Le bonus sectoriel, lui, reflète une vraie logique de pôle économique : s'installer dans la région où ton secteur est déjà enraciné (bassin industriel, main-d'œuvre qualifiée, fournisseurs à proximité) donne un vrai avantage compétitif."
            />{" "}
            Provinces
          </h1>
          <p className={styles.subtitle}>
            Investis dans les infrastructures d'une province — bénéfice partagé pour toutes les entreprises qui s'y
            trouvent, statut de contributeur visible publiquement, et un droit de peser sur le conseil provincial.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <InfoTip
            label="🏆"
            title="Classement provincial"
            mechanic="Les 11 provinces classées par fonds d'infrastructure cumulé — avec, pour chacune, ses entreprises actives, ses résidents (domicile fiscal choisi, cf. section ci-dessous) et leur patrimoine net cumulé."
            realWorld="Comme un classement de dynamisme économique régional : le fonds mesure l'investissement collectif, les résidents et leur richesse mesurent l'attractivité réelle de la province pour s'y installer."
          />
          <span>Classement provincial</span>
        </h2>
        <div className={styles.jobList}>
          {ranking.map((entry, index) => (
            <div key={entry.id} className={styles.jobCard}>
              <div>
                <span className={styles.rankBadge}>#{index + 1}</span>
                <span className={styles.jobTitle}>{entry.name}</span>
                <span className={styles.jobMeta}> — {entry.regionName}</span>
                <div className={styles.jobStats}>
                  <span>🏗️ {currencyFormatter.format(entry.infrastructureFund)}</span>
                  <span>🏢 {entry.activeCompanyCount} entreprise{entry.activeCompanyCount > 1 ? "s" : ""}</span>
                  <span>
                    🏠 {entry.residentCount} résident{entry.residentCount > 1 ? "s" : ""}
                    {entry.residentCount > 0 && ` (${currencyFormatter.format(entry.residentWealth)} cumulés)`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {[...byRegion.entries()].map(([regionName, list]) => (
        <section className={styles.section} key={regionName}>
          <h2 className={styles.sectionTitle}>{regionName}</h2>
          <div className={styles.jobList}>
            {list.map((m) => (
              <div key={m.id} className={styles.jobCard}>
                <div>
                  <div className={styles.jobTitle}>{m.name}</div>
                  {PROVINCE_PROPERTY_PROFILES[m.name] && (
                    <div className={styles.jobMeta}>{PROVINCE_PROPERTY_PROFILES[m.name].description}</div>
                  )}
                  {PROVINCE_SECTOR_AFFINITIES[m.name] && (
                    <div className={styles.jobStats}>
                      <span>🏭 Secteurs favorisés : {PROVINCE_SECTOR_AFFINITIES[m.name].join(", ")}</span>
                    </div>
                  )}
                </div>
                <div className={styles.jobActions}>
                  <Link className={styles.apply} href={`/provinces/${m.id}`}>
                    Voir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

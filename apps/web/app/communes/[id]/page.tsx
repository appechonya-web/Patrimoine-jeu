import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getCouncilProposals,
  getCurrentPlayer,
  getMunicipalities,
  getMunicipalityContributors,
  getMunicipalitySummary,
} from "../../../lib/session";
import { CommuneDetail } from "./commune-detail";
import styles from "../../page.module.css";

export default async function CommunePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [municipalities, summary, contributors, proposals] = await Promise.all([
    getMunicipalities(),
    getMunicipalitySummary(id),
    getMunicipalityContributors(id),
    getCouncilProposals(id),
  ]);
  const municipality = municipalities.find((m) => m.id === id);

  if (!municipality || !summary) {
    redirect("/communes");
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🏛️ {municipality.name}</h1>
          <p className={styles.subtitle}>{municipality.region.name}</p>
        </div>
        <Link className={styles.logout} href="/communes">
          ← Communes
        </Link>
      </header>

      <CommuneDetail
        municipalityId={id}
        summary={summary}
        contributors={contributors}
        proposals={proposals}
        myPseudo={player.pseudo}
      />
    </main>
  );
}

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentPlayer, getGuildMessages, getGuilds, getMyCompanies, type GuildMessageView } from "../../lib/session";
import { GuildsList } from "./guilds-list";
import styles from "../page.module.css";

export default async function GuildesPage() {
  const player = await getCurrentPlayer();
  if (!player) {
    redirect("/login");
  }

  const [guilds, myCompanies] = await Promise.all([getGuilds(), getMyCompanies()]);

  const myGuilds = guilds.filter((guild) => guild.members.some((m) => m.playerId === player.id));
  const messagesEntries = await Promise.all(
    myGuilds.map(async (guild) => [guild.id, await getGuildMessages(guild.id)] as const),
  );
  const messagesByGuildId: Record<string, GuildMessageView[]> = Object.fromEntries(messagesEntries);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>🤝 Cartels sectoriels</h1>
          <p className={styles.subtitle}>
            Des entreprises du même secteur s'entendent sur un prix plancher commun pour ne plus se dévaloriser
            entre elles — risqué : plus l'entente est flagrante (prix élevé, beaucoup de membres), plus elle a de
            chances d'être découverte à chaque cycle. En cas de découverte : dissolution immédiate, amende et
            réputation entamée pour chaque membre.
          </p>
        </div>
        <Link className={styles.logout} href="/">
          ← Tableau de bord
        </Link>
      </header>

      <GuildsList
        guilds={guilds}
        myCompanies={myCompanies.companies}
        playerId={player.id}
        messagesByGuildId={messagesByGuildId}
      />
    </main>
  );
}

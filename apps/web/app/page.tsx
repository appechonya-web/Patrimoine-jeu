import { redirect } from "next/navigation";
import { API_BASE_URL } from "../lib/config";
import {
  ApiUnreachableError,
  getAchievements,
  getCurrentCycle,
  getCurrentPlayer,
  getDailyBonusStatus,
  getFoundableSectors,
  getGigs,
  getIndependentActivity,
  getJobPostings,
  getJobs,
  getMunicipalities,
  getMyCompanies,
  getMyDeposits,
  getNotifications,
  getQuizStatus,
  getWealthBreakdown,
} from "../lib/session";
import { currencyFormatter } from "../lib/format";
import { LogoutButton } from "./logout-button";
import { MainNav } from "./main-nav";
import { EmploymentSection } from "./employment-section";
import { PeerJobsSection } from "./peer-jobs-section";
import { IndependentActivitySection } from "./independent-activity-section";
import { EngagementSection } from "./engagement-section";
import { QuizSection } from "./quiz-section";
import { GigsSection } from "./gigs-section";
import { CompaniesSection } from "./companies-section";
import { MyDepositsSection } from "./my-deposits-section";
import { CycleStatus } from "./cycle-status";
import { WealthBreakdownSection } from "./wealth-breakdown-section";
import { OnboardingChecklist } from "./onboarding-checklist";
import { InfoTip } from "./info-tip";
import styles from "./page.module.css";

export default async function HomePage() {
  let player;
  try {
    player = await getCurrentPlayer();
  } catch (err) {
    if (err instanceof ApiUnreachableError) {
      return (
        <main className={styles.main}>
          <h1>👑 Patrimoine Jeu</h1>
          <p className={styles.error}>
            Impossible de contacter l'API sur {API_BASE_URL}. Vérifie qu'elle tourne
            (pnpm --filter @patrimoine-jeu/api dev) et que Postgres est démarré.
          </p>
        </main>
      );
    }
    throw err;
  }

  if (!player) {
    redirect("/login");
  }

  const [
    jobs,
    jobPostings,
    cycle,
    sectors,
    municipalities,
    myCompanies,
    gigs,
    notifications,
    independentActivity,
    achievements,
    dailyBonus,
    quizStatus,
    myDeposits,
    wealthBreakdown,
  ] = await Promise.all([
    getJobs(),
    getJobPostings(),
    getCurrentCycle(),
    getFoundableSectors(),
    getMunicipalities(),
    getMyCompanies(),
    getGigs(),
    getNotifications(1),
    getIndependentActivity(),
    getAchievements(),
    getDailyBonusStatus(),
    getQuizStatus(),
    getMyDeposits(),
    getWealthBreakdown(),
  ]);
  const stats = player.stats;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1>👑 Patrimoine Jeu</h1>
          <p className={styles.subtitle}>Tableau de bord — {player.pseudo}</p>
        </div>
        <LogoutButton />
      </header>

      <MainNav unreadCount={notifications.unreadCount} />

      <CycleStatus cycle={cycle} />

      <OnboardingChecklist achievements={achievements} />

      <EngagementSection dailyBonus={dailyBonus} achievements={achievements} />

      <section className={styles.grid}>
        <div className={`${styles.card} ${styles.cardGold}`}>
          <span className={styles.label}>
            <InfoTip
              label="💰"
              title="Patrimoine liquide"
              mechanic="Ton cash réellement disponible — mis à jour instantanément par chaque action (achat, vente, salaire, dividende...), contrairement au patrimoine net (immobilier, entreprises, épargne) qui n'est recalculé qu'à la clôture de cycle."
              realWorld="C'est la différence entre trésorerie et patrimoine total : avoir un patrimoine net élevé ne veut rien dire si l'essentiel est immobilisé dans des biens illiquides — ce chiffre-ci est ce que tu peux vraiment dépenser maintenant."
            />{" "}
            Patrimoine liquide
          </span>
          <span className={styles.value}>{currencyFormatter.format(stats?.wealthLiquid ?? 0)}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.label}>
            <InfoTip
              label="🎓"
              title="Expérience"
              mechanic="Un point par cycle où tu es effectivement employé — un simple compteur cumulatif, utilisé pour le classement, sans effet direct sur tes revenus ou tes capacités."
              realWorld="Contrairement à l'expérience SECTORIELLE (qui, elle, réduit vraiment la pénalité de reconversion et la fatigue au travail), ce compteur global est plus proche d'un indicateur d'ancienneté générale qu'un vrai levier économique."
            />{" "}
            Expérience
          </span>
          <span className={styles.value}>{stats?.experience ?? 0}</span>
        </div>
      </section>

      <section className={styles.meters}>
        <Meter
          variant="reputation"
          label={
            <>
              <InfoTip
                label="⭐"
                title="Réputation"
                mechanic="Baisse en cas de faillite d'entreprise, défaut de prêt ou cartel démantelé ; monte avec certains métiers utiles socialement, de bonnes conditions de travail dans tes entreprises, ou en remboursant tes prêts. Certains petits boulots et emplois exigent un minimum pour être accessibles."
                realWorld="C'est ta cote de crédibilité sociale et financière — comme une réputation professionnelle ou un historique de paiement réel, elle conditionne l'accès à certaines opportunités plutôt que de rapporter directement de l'argent."
              />{" "}
              Réputation
            </>
          }
          value={stats?.reputation ?? 0}
        />
        <Meter
          variant="wellbeing"
          label={
            <>
              <InfoTip
                label="💗"
                title="Bien-être"
                mechanic="Descend avec la pression au travail et la gestion d'entreprises sans manager ; remonte passivement chaque cycle (accéléré par le levier personnel Sport). Sous 30/100, un malus de revenu s'applique (jusqu'à -25%) ; au-dessus de 70/100, un bonus (jusqu'à +10%)."
                realWorld="C'est un vrai résultat de recherche en santé au travail : le burnout réduit concrètement la performance professionnelle, tandis qu'un bon équilibre de vie l'améliore — ici modélisé comme un effet direct et mesurable sur le revenu net."
                tip="Si tu vois ton revenu baisser sans explication apparente, vérifie ce chiffre avant d'accuser autre chose — un bien-être sous 30 grignote silencieusement tous tes revenus d'emploi."
              />{" "}
              Bien-être
            </>
          }
          value={stats?.wellbeing ?? 0}
          sublabel={wellbeingZoneLabel(stats?.wellbeing ?? 50)}
        />
      </section>

      <WealthBreakdownSection breakdown={wealthBreakdown} />

      <EmploymentSection employment={player.employment} jobs={jobs} />

      <PeerJobsSection postings={jobPostings} />

      <IndependentActivitySection employment={player.employment} activity={independentActivity} />

      <GigsSection gigs={gigs} />

      <QuizSection status={quizStatus} />

      <CompaniesSection
        companies={myCompanies.companies}
        sectors={sectors}
        municipalities={municipalities}
        nextFoundingCost={myCompanies.nextFoundingCost}
        canFoundAnother={myCompanies.canFoundAnother}
        expansionRequirement={myCompanies.expansionRequirement}
      />

      <MyDepositsSection deposits={myDeposits} />

      <footer className={styles.footer}>
        <span>{player.email}</span>
        <span>Membre depuis le {new Date(player.createdAt).toLocaleDateString("fr-BE")}</span>
      </footer>
    </main>
  );
}

function Meter({
  label,
  value,
  sublabel,
  variant,
}: {
  label: React.ReactNode;
  value: number;
  sublabel?: string;
  variant: "reputation" | "wellbeing";
}) {
  const trackClass = variant === "wellbeing" ? `${styles.meterTrack} ${styles.meterTrackWellbeing}` : styles.meterTrack;
  const fillClass = variant === "wellbeing" ? `${styles.meterFill} ${styles.meterFillWellbeing}` : styles.meterFill;

  return (
    <div className={styles.meter}>
      <div className={styles.meterHeader}>
        <span>
          {label}
          {sublabel && <span className={styles.jobMeta}> — {sublabel}</span>}
        </span>
        <span>{value.toFixed(0)}/100</span>
      </div>
      <div className={trackClass}>
        <div className={fillClass} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
    </div>
  );
}

function wellbeingZoneLabel(wellbeing: number): string {
  if (wellbeing >= 70) return "épanoui, léger bonus de revenu";
  if (wellbeing < 30) return "burnout, malus de revenu";
  return "neutre";
}

import "dotenv/config";
import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@patrimoine-jeu/db";
import { closeCurrentCycle, getOrCreateOpenCycle } from "@patrimoine-jeu/game-engine";

/**
 * Durée d'un cycle en millisecondes — un cycle horaire par défaut (audit
 * d'équilibrage : le rythme quotidien précédent rendait les paliers comptés
 * en cycles beaucoup trop lents en temps réel, ex. EXPANSION_MIN_CYCLES_ACTIVE
 * à 728 cycles = ~2 ans). Accélérer ici plutôt que réduire chaque seuil
 * individuellement préserve tous les ratios relatifs entre paliers
 * (hebdomadaire, mensuel...) — seul le mapping cycle→temps réel change.
 * CYCLES_PER_YEAR (packages/domain/src/employment.ts) reste 365 et n'a pas
 * besoin de changer : la fiscalité est annualisée par cycle, pas par temps
 * réel, donc l'année fiscale in-game se joue juste plus vite (~15 jours
 * réels au lieu d'un an). Deux exceptions volontairement RE-calibrées à la
 * hausse en nombre de cycles pour rester proches d'un an réel malgré
 * l'accélération : LIQUIDATION_RESERVE_HOLDING_CYCLES et PENSION_TERM_CYCLES
 * (cf. packages/domain/src/dividends.ts, savings.ts). Surchargeable via
 * CYCLE_DURATION_MS (utile en dev pour observer plusieurs clôtures sans
 * attendre une heure réelle).
 */
const CYCLE_DURATION_MS = Number(process.env.CYCLE_DURATION_MS ?? 60 * 60 * 1000);

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const cycleClosureQueue = new Queue("cycle-closure", { connection });

// Clôture de cycle : loyers, résultats d'entreprise, intérêts d'emprunt,
// impôts, événements (section 2 du document de conception). Uniquement des
// salaires pour l'instant — le reste arrivera avec l'immobilier et les
// entreprises. Volontairement DÉCLENCHÉ PAR LE TEMPS, jamais par une action
// joueur : sinon un joueur peut réclamer un salaire à l'infini en boucle.
const cycleClosureWorker = new Worker(
  "cycle-closure",
  async (job) => {
    const result = await closeCurrentCycle(prisma);
    console.log(
      `[cycle-closure] job ${job.id} — cycle ${result.closedCycle} clôturé ` +
        `(${result.payrollCount} salaires versés), cycle ${result.nextCycle} ouvert`,
    );
    return result;
  },
  { connection },
);

async function bootstrap() {
  await getOrCreateOpenCycle(prisma);

  // BullMQ garde les jobs répétables en mémoire Redis, indexés par un hash
  // de leurs options (dont `every`) — pas seulement par jobId. Si
  // CYCLE_DURATION_MS change entre deux démarrages sans ce nettoyage,
  // l'ancien planning continue de tourner EN PLUS du nouveau (vécu en dev :
  // un vieux cycle de 8s qui traîne à côté du nouveau de 5 min). On repart
  // donc toujours d'un planning propre au boot.
  const existingSchedules = await cycleClosureQueue.getRepeatableJobs();
  await Promise.all(
    existingSchedules.map((schedule) => cycleClosureQueue.removeRepeatableByKey(schedule.key)),
  );

  await cycleClosureQueue.add("cycle-closure", {}, { repeat: { every: CYCLE_DURATION_MS } });

  console.log(`Worker ready, clôture automatique toutes les ${CYCLE_DURATION_MS / 1000}s`);
}

bootstrap().catch((error) => {
  console.error("Échec du démarrage du worker", error);
  process.exit(1);
});

cycleClosureWorker.on("failed", (job, error) => {
  console.error(`[cycle-closure] job ${job?.id} a échoué`, error);
});

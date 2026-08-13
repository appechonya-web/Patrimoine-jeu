import { Worker } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Traitement de clôture de cycle (loyers, résultats d'entreprise, impôts,
// événements) — cf. section 2 du document de conception. Logique à implémenter.
const cycleClosureWorker = new Worker(
  "cycle-closure",
  async (job) => {
    console.log(`Processing cycle closure job ${job.id}`);
  },
  { connection },
);

cycleClosureWorker.on("ready", () => {
  console.log("Worker ready, listening on queue 'cycle-closure'");
});

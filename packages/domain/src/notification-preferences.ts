import { z } from "zod";
import type { NotificationType } from "./notifications.js";

/**
 * Alerte mail / digest périodique (cf. section 12sexies du document de
 * conception) — deux niveaux : URGENT (fenêtre d'action — défaut de
 * paiement, enchère qui se termine, offre de rachat/proposition en
 * attente) déclenche une "alerte mail" quand le joueur l'a activée ;
 * INFORMATIF (relevé de cycle, presse économique, mouvements de la
 * concurrence) est regroupé en digest périodique plutôt qu'en flux continu.
 *
 * Aucun service d'envoi réel n'est branché (pas d'identifiants SMTP dans ce
 * projet) — l'"alerte mail" est simulée par une boîte d'envoi consultable
 * (cf. notifications.service.ts getEmailOutbox) : une vue filtrée des
 * notifications urgentes du joueur, formatée comme un email, visible et
 * vérifiable sans fabriquer d'intégration tierce factice.
 */

export const URGENT_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "mortgage-default",
  "company-loan-default",
  "community-loan-default",
  "company-bankrupt",
  "auction-won",
  "auction-default",
  "sale-bid-received",
  "hostile-takeover",
  "capital-raise-control-lost",
  "insurance-lapsed",
  "job-lost",
];

/** Regroupement du fil informatif en digest — 7 cycles, soit ~7h réelles à raison d'1 cycle/heure (cf. apps/worker/src/index.ts). */
export const DIGEST_PERIOD_CYCLES = 7;

export const setEmailAlertsInputSchema = z.object({
  enabled: z.boolean(),
});
export type SetEmailAlertsInput = z.infer<typeof setEmailAlertsInputSchema>;

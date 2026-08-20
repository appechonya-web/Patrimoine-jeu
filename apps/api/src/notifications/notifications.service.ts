import { Injectable } from "@nestjs/common";
import {
  DIGEST_PERIOD_CYCLES,
  NOTIFICATIONS_DEFAULT_LIMIT,
  URGENT_NOTIFICATION_TYPES,
  type SetEmailAlertsInput,
} from "@patrimoine-jeu/domain";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(playerId: string, limit = NOTIFICATIONS_DEFAULT_LIMIT) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.client.playerNotification.findMany({
        where: { playerId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      this.prisma.client.playerNotification.count({ where: { playerId, readAt: null } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        cycle: n.cycle,
        createdAt: n.createdAt,
        read: n.readAt !== null,
      })),
      unreadCount,
    };
  }

  async markAllRead(playerId: string) {
    await this.prisma.client.playerNotification.updateMany({
      where: { playerId, readAt: null },
      data: { readAt: new Date() },
    });
    return { read: true };
  }

  async getEmailAlertsPreference(playerId: string) {
    const player = await this.prisma.client.player.findUniqueOrThrow({
      where: { id: playerId },
      select: { emailAlertsEnabled: true },
    });
    return { enabled: player.emailAlertsEnabled };
  }

  async setEmailAlertsPreference(playerId: string, input: SetEmailAlertsInput) {
    await this.prisma.client.player.update({ where: { id: playerId }, data: { emailAlertsEnabled: input.enabled } });
    return { enabled: input.enabled };
  }

  /**
   * Boîte d'envoi simulée (cf. domain/notification-preferences.ts) — aucun
   * service SMTP réel n'est branché dans ce projet ; cette vue formate les
   * notifications URGENTES du joueur comme des emails qui AURAIENT été
   * envoyés s'il a activé l'option, pour rester vérifiable sans fabriquer
   * une intégration tierce factice. Vide si l'option est désactivée.
   */
  async getEmailOutbox(playerId: string, limit = NOTIFICATIONS_DEFAULT_LIMIT) {
    const player = await this.prisma.client.player.findUniqueOrThrow({
      where: { id: playerId },
      select: { emailAlertsEnabled: true },
    });
    if (!player.emailAlertsEnabled) return [];

    const notifications = await this.prisma.client.playerNotification.findMany({
      where: { playerId, type: { in: [...URGENT_NOTIFICATION_TYPES] } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return notifications.map((n) => ({
      id: n.id,
      subject: `[Patrimoine Jeu] Alerte — ${n.message}`,
      body: n.message,
      cycle: n.cycle,
      sentAt: n.createdAt,
    }));
  }

  /**
   * Digest périodique du fil INFORMATIF (cf. domain/notification-preferences.ts)
   * — regroupé par période de DIGEST_PERIOD_CYCLES cycles plutôt que
   * présenté en flux continu, à la différence de list() ci-dessus qui reste
   * le journal complet chronologique.
   */
  async getDigest(playerId: string) {
    const notifications = await this.prisma.client.playerNotification.findMany({
      where: { playerId, type: { notIn: [...URGENT_NOTIFICATION_TYPES] } },
      orderBy: { cycle: "desc" },
      take: 200,
    });

    const periods = new Map<number, typeof notifications>();
    for (const notification of notifications) {
      const periodStart = Math.floor(notification.cycle / DIGEST_PERIOD_CYCLES) * DIGEST_PERIOD_CYCLES;
      const bucket = periods.get(periodStart) ?? [];
      bucket.push(notification);
      periods.set(periodStart, bucket);
    }

    return [...periods.entries()]
      .sort(([a], [b]) => b - a)
      .map(([periodStartCycle, items]) => ({
        periodStartCycle,
        periodEndCycle: periodStartCycle + DIGEST_PERIOD_CYCLES - 1,
        items: items.map((n) => ({ id: n.id, type: n.type, message: n.message, cycle: n.cycle })),
      }));
  }
}

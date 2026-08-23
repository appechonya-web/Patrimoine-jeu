import { Injectable, Logger } from "@nestjs/common";

/**
 * Relaie les événements marquants du jeu (crises/booms sectoriels, faillites,
 * défis débloqués, levées de fonds complétées) vers un salon Discord via un
 * webhook — le pilier social du jeu, pas juste un fil de log. Silencieux si
 * DISCORD_WEBHOOK_URL n'est pas configuré (ex. environnement de dev local) :
 * ne bloque jamais le vrai traitement du jeu si Discord est indisponible.
 */
@Injectable()
export class DiscordNotifierService {
  private readonly logger = new Logger(DiscordNotifierService.name);
  private readonly webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  /** Limite Discord réelle (2000) — marge de sécurité pour l'en-tête ajouté par postCycleEvents. */
  private readonly maxContentLength = 1900;

  constructor() {
    if (!this.webhookUrl) {
      this.logger.warn("DISCORD_WEBHOOK_URL absente : les notifications Discord sont désactivées.");
    } else if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(this.webhookUrl)) {
      this.logger.warn(
        `DISCORD_WEBHOOK_URL configurée mais ne ressemble pas à une URL de webhook Discord valide (préfixe: ${this.webhookUrl.slice(0, 30)}...).`,
      );
    } else {
      this.logger.log(`Discord webhook configuré (${this.webhookUrl.slice(0, 40)}...).`);
    }
  }

  async postMessage(content: string): Promise<void> {
    if (!this.webhookUrl) return;

    const truncated =
      content.length > this.maxContentLength ? `${content.slice(0, this.maxContentLength)}…` : content;

    try {
      const res = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: truncated }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "<illisible>");
        this.logger.warn(`Discord webhook a répondu ${res.status} : ${body}`);
      } else {
        this.logger.log(`Discord webhook : message envoyé (${res.status}).`);
      }
    } catch (err) {
      this.logger.warn(`Discord webhook injoignable : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async postCycleEvents(events: string[], cycleNumber: number): Promise<void> {
    if (events.length === 0) return;
    await this.postMessage(`**📰 Cycle n°${cycleNumber}**\n${events.join("\n")}`);
  }
}

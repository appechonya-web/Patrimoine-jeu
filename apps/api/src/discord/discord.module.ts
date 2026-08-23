import { Module } from "@nestjs/common";
import { DiscordNotifierService } from "./discord-notifier.service.js";

@Module({
  providers: [DiscordNotifierService],
  exports: [DiscordNotifierService],
})
export class DiscordModule {}

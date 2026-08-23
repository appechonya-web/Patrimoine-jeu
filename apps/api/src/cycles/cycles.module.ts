import { Module } from "@nestjs/common";
import { DiscordModule } from "../discord/discord.module.js";
import { CyclesController } from "./cycles.controller.js";
import { CyclesService } from "./cycles.service.js";

@Module({
  imports: [DiscordModule],
  controllers: [CyclesController],
  providers: [CyclesService],
  exports: [CyclesService],
})
export class CyclesModule {}

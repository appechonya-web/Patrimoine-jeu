import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { DiscordModule } from "../discord/discord.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { CompaniesController } from "./companies.controller.js";
import { CompaniesService } from "./companies.service.js";

@Module({
  imports: [AuthModule, CyclesModule, DiscordModule, EngagementModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}

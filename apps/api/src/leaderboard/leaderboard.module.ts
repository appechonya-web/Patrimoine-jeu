import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { LeaderboardController } from "./leaderboard.controller.js";
import { LeaderboardService } from "./leaderboard.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}

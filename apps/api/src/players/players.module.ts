import { Module } from "@nestjs/common";
import { PlayersController } from "./players.controller.js";
import { PlayersService } from "./players.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { EmploymentModule } from "../employment/employment.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";

@Module({
  imports: [AuthModule, EmploymentModule, CyclesModule],
  controllers: [PlayersController],
  providers: [PlayersService],
})
export class PlayersModule {}

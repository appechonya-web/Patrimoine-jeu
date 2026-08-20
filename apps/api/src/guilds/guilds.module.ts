import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { GuildsController } from "./guilds.controller.js";
import { GuildsService } from "./guilds.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [GuildsController],
  providers: [GuildsService],
})
export class GuildsModule {}

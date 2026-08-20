import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { GigsController } from "./gigs.controller.js";
import { GigsService } from "./gigs.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [GigsController],
  providers: [GigsService],
})
export class GigsModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { IndependentActivityController } from "./independent-activity.controller.js";
import { IndependentActivityService } from "./independent-activity.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [IndependentActivityController],
  providers: [IndependentActivityService],
})
export class IndependentActivityModule {}

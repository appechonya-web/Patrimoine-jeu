import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { PropertiesController } from "./properties.controller.js";
import { PropertiesService } from "./properties.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}

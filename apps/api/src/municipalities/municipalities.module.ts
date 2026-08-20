import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { MunicipalitiesController } from "./municipalities.controller.js";
import { MunicipalitiesService } from "./municipalities.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [MunicipalitiesController],
  providers: [MunicipalitiesService],
})
export class MunicipalitiesModule {}

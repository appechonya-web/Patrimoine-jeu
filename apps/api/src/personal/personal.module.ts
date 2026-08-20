import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { PersonalController } from "./personal.controller.js";
import { PersonalService } from "./personal.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [PersonalController],
  providers: [PersonalService],
})
export class PersonalModule {}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { EngagementModule } from "../engagement/engagement.module.js";
import { QuizController } from "./quiz.controller.js";
import { QuizService } from "./quiz.service.js";

@Module({
  imports: [AuthModule, CyclesModule, EngagementModule],
  controllers: [QuizController],
  providers: [QuizService],
})
export class QuizModule {}

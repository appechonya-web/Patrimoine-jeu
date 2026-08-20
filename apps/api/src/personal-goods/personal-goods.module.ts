import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CyclesModule } from "../cycles/cycles.module.js";
import { PersonalGoodsController } from "./personal-goods.controller.js";
import { PersonalGoodsService } from "./personal-goods.service.js";

@Module({
  imports: [AuthModule, CyclesModule],
  controllers: [PersonalGoodsController],
  providers: [PersonalGoodsService],
})
export class PersonalGoodsModule {}

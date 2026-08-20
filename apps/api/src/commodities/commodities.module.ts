import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CommoditiesController } from "./commodities.controller.js";
import { CommoditiesService } from "./commodities.service.js";

@Module({
  imports: [AuthModule],
  controllers: [CommoditiesController],
  providers: [CommoditiesService],
})
export class CommoditiesModule {}

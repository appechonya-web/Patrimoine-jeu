import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { PressController } from "./press.controller.js";
import { PressService } from "./press.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PressController],
  providers: [PressService],
})
export class PressModule {}

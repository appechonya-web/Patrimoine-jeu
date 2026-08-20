import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export const CurrentPlayer = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<Request & { playerId: string }>();
  return request.playerId;
});

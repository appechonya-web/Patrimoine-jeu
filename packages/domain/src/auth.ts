import { z } from "zod";

export const registerInputSchema = z.object({
  email: z.string().email(),
  pseudo: z.string().min(3).max(32),
  password: z.string().min(8).max(72),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

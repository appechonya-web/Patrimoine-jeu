import { z } from "zod";
import { DEFAULT_STARTING_PROFILE_ID, STARTING_PROFILE_IDS } from "./starting-profile.js";

export const registerInputSchema = z.object({
  email: z.string().email(),
  pseudo: z.string().min(3).max(32),
  password: z.string().min(8).max(72),
  startingProfileId: z.enum(STARTING_PROFILE_IDS).default(DEFAULT_STARTING_PROFILE_ID),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

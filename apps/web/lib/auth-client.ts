import { ApiClientError, postJson } from "./api-client";

export { ApiClientError as AuthError };

export async function login(email: string, password: string): Promise<void> {
  await postJson("/auth/login", { email, password });
}

export async function register(email: string, pseudo: string, password: string): Promise<void> {
  await postJson("/auth/register", { email, pseudo, password });
}

export async function logout(): Promise<void> {
  await postJson("/auth/logout");
}

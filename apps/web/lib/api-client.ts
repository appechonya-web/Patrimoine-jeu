export class ApiClientError extends Error {}

/**
 * Chemin relatif, jamais l'URL absolue de l'API — le navigateur ne parle
 * qu'à son propre domaine (patrimoine-jeu.vercel.app par ex.), Next.js
 * relaie vers l'API en coulisses via le rewrite de next.config.mjs. Deux
 * problèmes réglés d'un coup : API_URL n'est pas une variable NEXT_PUBLIC_
 * (elle ne serait jamais présente dans le bundle envoyé au navigateur), et
 * le cookie de session reste un cookie de premier parti même si l'API vit
 * sur un domaine distinct — pas besoin de SameSite=None.
 */
const API_PROXY_PREFIX = "/api";

async function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_PROXY_PREFIX}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError("Impossible de contacter l'API");
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiClientError(extractMessage(payload) ?? "Une erreur est survenue");
  }

  return payload as T;
}

export function getJson<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function postJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

export function deleteJson<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("DELETE", path, body);
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message)) return message.join(", ");

  const formErrors = (payload as { formErrors?: unknown }).formErrors;
  if (Array.isArray(formErrors) && formErrors.length > 0) return formErrors.join(", ");

  const fieldErrors = (payload as { fieldErrors?: unknown }).fieldErrors;
  if (fieldErrors && typeof fieldErrors === "object") {
    const firstField = Object.values(fieldErrors as Record<string, unknown>).find(
      (errors): errors is string[] => Array.isArray(errors) && errors.length > 0,
    );
    if (firstField) return firstField[0];
  }

  return null;
}

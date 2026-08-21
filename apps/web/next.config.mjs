/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@patrimoine-jeu/domain"],
  // Proxy /api/* vers la vraie API (cf. lib/api-client.ts) — le navigateur
  // ne parle jamais directement au domaine de l'API : évite le problème de
  // cookie cross-site et le fait qu'API_URL (variable serveur, jamais
  // NEXT_PUBLIC_) ne serait de toute façon pas visible côté navigateur.
  async rewrites() {
    // API_URL n'est pas un secret (c'est l'adresse publique que le navigateur
    // atteint de toute façon via ce proxy) — on code en dur le fallback de
    // prod pour ne pas dépendre de la bonne propagation de la variable
    // d'environnement par la plateforme d'hébergement du front.
    const productionDefault = "https://patrimoine-jeu.onrender.com";
    const developmentDefault = "http://localhost:3001";
    const apiUrl =
      process.env.API_URL ?? (process.env.NODE_ENV === "production" ? productionDefault : developmentDefault);
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;

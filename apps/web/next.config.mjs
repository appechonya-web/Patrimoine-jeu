/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@patrimoine-jeu/domain"],
  // Proxy /api/* vers la vraie API (cf. lib/api-client.ts) — le navigateur
  // ne parle jamais directement au domaine de l'API : évite le problème de
  // cookie cross-site et le fait qu'API_URL (variable serveur, jamais
  // NEXT_PUBLIC_) ne serait de toute façon pas visible côté navigateur.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:3001";
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;

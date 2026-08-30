#!/bin/bash
# Lance l'instance turbo locale : cycles accélérés (10s au lieu de 30min),
# base de données et ports séparés de la version normale et de la prod.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET="6cffec60be4485fa3be047883f8c0749ad07ebc704826b86"
TURBO_DB="postgresql://patrimoine:patrimoine@localhost:5432/patrimoine_jeu_turbo"

# Nettoie une éventuelle instance turbo déjà en cours (ports + boucle de cycle).
(lsof -ti :3011 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true
(lsof -ti :3010 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true
pkill -f "turbo-cycle-loop.sh" 2>/dev/null || true
sleep 1

echo "Démarrage de l'API turbo (port 3011, cycles de 10s)..."
cd "$ROOT/apps/api"
DATABASE_URL="$TURBO_DB" \
JWT_SECRET="dev-secret-change-me" \
PORT=3011 \
WEB_URL="http://localhost:3010" \
INTERNAL_CYCLE_SECRET="$SECRET" \
CYCLE_DURATION_MS=10000 \
nohup node dist/main.js > /tmp/api-turbo.log 2>&1 &
disown

echo "Démarrage du web turbo (port 3010)..."
cd "$ROOT/apps/web"
# next dev (pas next start) : le proxy /api/* de next.config.mjs est figé dans
# le build de "next build" au moment où il tourne, donc "next start" sert
# toujours la destination de la DERNIÈRE build normale (souvent la prod),
# quelle que soit la valeur d'API_URL passée à start. "next dev" relit
# process.env.API_URL à chaque démarrage du serveur, ce qui est ce qu'il faut
# ici — et n'affecte en rien le build normal utilisé par "next start" ailleurs.
#
# NEXT_DIST_DIR=.next-turbo : "next dev" et "next start" ne peuvent pas
# partager le même dossier ".next" sans corrompre le cache (le CSS global
# cesse de charger) — dossier de build dédié pour ne jamais entrer en
# collision avec celui du serveur de dev normal.
rm -rf .next-turbo
API_URL="http://localhost:3011" NEXT_DIST_DIR=".next-turbo" nohup ./node_modules/.bin/next dev -p 3010 > /tmp/web-turbo.log 2>&1 &
disown

echo "Démarrage de la boucle de clôture de cycle..."
nohup "$ROOT/scripts/turbo-cycle-loop.sh" > /tmp/turbo-cycle-loop.log 2>&1 &
disown

sleep 3
echo
echo "Turbo prêt :"
echo "  Web : http://localhost:3010"
echo "  API : http://localhost:3011"
echo "  Compte de test : joueur.test@patrimoine-jeu.local / test1234"
echo "  Pour arrêter : scripts/stop-turbo.sh"

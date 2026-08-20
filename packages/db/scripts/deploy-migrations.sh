#!/usr/bin/env bash
set -euo pipefail

# Applique toutes les migrations hand-written dans l'ordre, contre la base
# indiquée par DATABASE_URL — jamais via `prisma migrate deploy`/`dev`
# (bannis dans ce projet : un `prisma migrate dev` a provoqué une purge
# complète de la base en cours de développement). Chaque migration.sql est
# exécuté directement via psql, puis marqué "applied" dans
# _prisma_migrations pour que Prisma Client sache que le schéma est à jour.
#
# Pensé pour une base FRAÎCHE (aucune migration déjà appliquée, typiquement
# une base de production toute neuve) — sur une base existante, vérifier
# d'abord le contenu de _prisma_migrations avant de lancer ce script, pour
# ne pas rejouer une migration déjà appliquée.
#
# Usage : DATABASE_URL="postgresql://..." ./scripts/deploy-migrations.sh

cd "$(dirname "$0")/.."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL doit être défini." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql introuvable — installe le client PostgreSQL (ex. 'brew install libpq' sur macOS) avant de relancer." >&2
  exit 1
fi

for dir in prisma/migrations/*/; do
  name=$(basename "$dir")
  sql_file="${dir}migration.sql"
  [ -f "$sql_file" ] || continue

  echo "== ${name} =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql_file"
  corepack pnpm exec prisma migrate resolve --applied "$name"
done

echo "Terminé."

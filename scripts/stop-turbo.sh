#!/bin/bash
# Arrête l'instance turbo locale (API, web, boucle de cycle).
(lsof -ti :3011 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true
(lsof -ti :3010 -sTCP:LISTEN 2>/dev/null | xargs -r kill) || true
pkill -f "turbo-cycle-loop.sh" 2>/dev/null || true
echo "Turbo arrêté."

#!/bin/bash
# Poll POST /cycles/internal-close on the turbo instance so cycles actually
# close as fast as CYCLE_DURATION_MS allows — locally there's no cron
# (unlike prod's GitHub Actions workflow), so something has to call this.
SECRET="6cffec60be4485fa3be047883f8c0749ad07ebc704826b86"
while true; do
  curl -s -X POST http://localhost:3011/cycles/internal-close -H "x-internal-secret: $SECRET" > /dev/null
  sleep 3
done

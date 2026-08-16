#!/bin/bash
# Poll GitHub main; rebuild+deploy to webroot only when it changed.
cd /opt/builds/eprisjournal || exit 0
git fetch origin main --quiet 2>/dev/null || exit 0
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "[$(date)] change $LOCAL -> $REMOTE, deploying..."
  /bin/bash /opt/deploy-eprisjournal.sh
fi

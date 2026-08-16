#!/bin/bash
set -e
cd /opt/builds/eprisjournal

# ── Drift guard: catch hand-edits to the served files before they're lost ──
# rsync --delete below replaces /var/www/eprisjournal wholesale on every
# deploy, and a deploy fires within ~2 minutes of ANY new commit (including
# the automated nightly content snapshot) — so a file edited directly in
# /var/www (skipping git entirely) survives for an unpredictable window of
# minutes to hours, then vanishes with no trace and no error. This happened
# for real on 2026-08-02: admin/app.js was hand-edited on the server and
# would have been silently overwritten by the next deploy.
#
# dist/admin/ still holds this build's *previous* output at this point —
# vite hasn't run yet — so it's the correct "what the live file should be"
# reference. A mismatch here means someone touched /var/www since the last
# deploy, independent of whatever this new commit changes. Never blocks the
# deploy; a false positive here must not stop the site from updating.
DRIFT_BACKUP_DIR="/opt/eprisjournal-drift-backups"
DRIFT_LOG="/var/log/eprisjournal-drift.log"
drift_found=0
if [ -d dist/admin ] && [ -d /var/www/eprisjournal/admin ]; then
  for f in dist/admin/*.js dist/admin/*.html dist/admin/*.css; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    live="/var/www/eprisjournal/admin/$name"
    if [ -f "$live" ] && ! cmp -s "$f" "$live"; then
      drift_found=1
      mkdir -p "$DRIFT_BACKUP_DIR"
      stamp=$(date +%Y%m%d-%H%M%S)
      cp "$live" "$DRIFT_BACKUP_DIR/${name}.${stamp}"
      echo "[$(date)] DRIFT: $name differs from last deploy — hand-edited live? Saved to $DRIFT_BACKUP_DIR/${name}.${stamp}" | tee -a "$DRIFT_LOG"
    fi
  done
fi
if [ "$drift_found" = "1" ]; then
  echo "[eprisjournal] drift detected and backed up — see $DRIFT_LOG" | tee -a "$DRIFT_LOG"
fi

echo "[eprisjournal] pulling latest..."
git pull origin main
echo "[eprisjournal] installing deps..."
npm ci --silent
echo "[eprisjournal] building..."
# Two separate commands, NOT "vite build && node ...".
#
# set -e is ignored for every command of an AND-OR list except the last, so a
# failed build in "vite build && node og-pages" did not stop this script: on
# 2026-08-16 the build died with a V8 heap OOM and the next line happily
# rsynced the PREVIOUS dist over the webroot and logged "done". The site kept
# serving a stale build while every log line said the deploy had succeeded.
#
# The heap cap is deliberate too. Node sizes its old space from total RAM
# (~870MB on this 1.7GB box) and this build peaks just above that; the box has
# 2GB of swap to absorb the difference, so raising the ceiling is what lets the
# build finish instead of aborting.
NODE_OPTIONS="--max-old-space-size=1400" npx vite build
node scripts/generate-og-pages.mjs

# Belt and braces: never ship a dist that this run did not produce. If the
# build somehow exits 0 without writing anything, that is still a stale deploy.
if [ ! -f dist/index.html ]; then
  echo "[eprisjournal] FATAL: dist/index.html missing after build — not deploying" >&2
  exit 1
fi
if [ -n "$(find dist/index.html -mmin +10)" ]; then
  echo "[eprisjournal] FATAL: dist/index.html is older than 10 minutes — build did not run, not deploying" >&2
  exit 1
fi

echo "[eprisjournal] deploying..."
rsync -a --delete dist/ /var/www/eprisjournal/
chown -R nginx:nginx /var/www/eprisjournal
chcon -R -t httpd_sys_content_t /var/www/eprisjournal/
echo "[eprisjournal] done ✓"

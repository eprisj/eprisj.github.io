#!/usr/bin/env bash
# Fetch, build and publish EPRIS Journal without overlapping deploys or
# replacing the live tree with a half-written build.
set -Eeuo pipefail
umask 027

REPO=/opt/builds/eprisjournal
LIVE=/var/www/eprisjournal
RELEASES=/var/www/eprisjournal-releases
LOCK=/run/lock/eprisjournal-deploy.lock
LOG=/var/log/eprisjournal-deploy.log
ASKPASS=/opt/epris-github-askpass
MODE=${1:---manual}

exec 9>"$LOCK"
flock -n 9 || exit 0

log() { echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
fail() { log "FATAL: $*" >&2; exit 1; }

export GIT_ASKPASS="$ASKPASS"
export GIT_TERMINAL_PROMPT=0
[ -x "$ASKPASS" ] || fail "missing executable $ASKPASS"

cd "$REPO"

# Every build rewrites this tracked file (scripts/media-ratios.mjs), so what the
# previous build left behind is not a hand edit. Without this the guard below
# refused every deploy after the first one (2026-10-23 .. 24).
git checkout -- src/content/media-ratios.json 2>/dev/null || true

# Hand-edited tracked files are never silently overwritten. Ignored runtime
# snapshots are fine; tracked changes require a human to reconcile them.
git diff --quiet || fail "tracked worktree changes; refusing to deploy"
git diff --cached --quiet || fail "staged worktree changes; refusing to deploy"

log "checking GitHub main..."
git fetch --prune origin main || fail "git fetch failed"
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ] && [ "$MODE" = "--poll" ]; then
  exit 0
fi

if [ "$LOCAL" != "$REMOTE" ]; then
  git merge --ff-only origin/main || fail "origin/main is not a fast-forward; manual reconciliation required"
  RELEASE_SHA=$(git rev-parse HEAD)
else
  RELEASE_SHA="$LOCAL"
fi

log "building $RELEASE_SHA..."
npm ci --silent || fail "npm ci failed"
NODE_OPTIONS="--max-old-space-size=1400" ./node_modules/.bin/vite build || fail "vite build failed"
node scripts/generate-og-pages.mjs || fail "OG page generation failed"

[ -s dist/index.html ] || fail "dist/index.html missing after build"
printf '%s\n' "$RELEASE_SHA" > dist/.epris-build

# Compare the previous build with the served tree before replacing it. A
# direct server edit is preserved in the drift archive and reported, not lost.
DRIFT_BACKUP_DIR=/opt/eprisjournal-drift-backups
DRIFT_LOG=/var/log/eprisjournal-drift.log
LIVE_DIR=$(readlink -f "$LIVE" 2>/dev/null || printf '%s' "$LIVE")
drift_found=0
if [ -d dist/admin ] && [ -d "$LIVE_DIR/admin" ]; then
  for f in dist/admin/*.js dist/admin/*.html dist/admin/*.css; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    live_file="$LIVE_DIR/admin/$name"
    if [ -f "$live_file" ] && ! cmp -s "$f" "$live_file"; then
      drift_found=1
      mkdir -p "$DRIFT_BACKUP_DIR"
      stamp=$(date +%Y%m%d-%H%M%S)
      cp -- "$live_file" "$DRIFT_BACKUP_DIR/${name}.${stamp}"
      echo "[$(date)] DRIFT: $name saved to $DRIFT_BACKUP_DIR/${name}.${stamp}" >> "$DRIFT_LOG"
    fi
  done
fi
[ "$drift_found" = 0 ] || log "warning: live admin drift archived in $DRIFT_BACKUP_DIR"

# Stage the complete release under a commit-specific directory, then switch
# one symlink. Nginx sees either the old complete release or the new one.
mkdir -p "$RELEASES"
chown root:nginx "$RELEASES"
chmod 0750 "$RELEASES"
RELEASE_DIR="$RELEASES/$RELEASE_SHA"
rm -rf -- "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"
rsync -a --delete dist/ "$RELEASE_DIR/" || fail "release rsync failed"

# Вкладки, открытые до деплоя, продолжают просить чанки прошлого релиза:
# имена содержат хеш содержимого, старый каталог жив, но недостижим по
# адресу — и вкладка получает 404 вместо кода. Переносим ассеты прошлого
# релиза в новый: имена по содержимому, конфликтовать нечему. При деплое
# раз в 2 минуты недельное окно копило гигабайты старых чанков в каждом
# релизе; суток с запасом хватает любой открытой вкладке.
ASSET_GRACE_DAYS=1
PREV_DIR=$(readlink -f "$LIVE" 2>/dev/null || true)
if [ -n "$PREV_DIR" ] && [ -d "$PREV_DIR/assets" ] && [ "$PREV_DIR" != "$RELEASE_DIR" ]; then
  rsync -a --ignore-existing "$PREV_DIR/assets/" "$RELEASE_DIR/assets/" \
    || log "warning: carrying previous assets forward failed"
  find "$RELEASE_DIR/assets" -type f -mtime +$ASSET_GRACE_DAYS -delete 2>/dev/null || true
  log "carried forward $(ls -1 "$RELEASE_DIR/assets" | wc -l) assets (grace ${ASSET_GRACE_DAYS}d)"
fi
chown -R nginx:nginx "$RELEASE_DIR"
# umask 027 вище лишає файли в режимі 640; якщо chown не спрацював,
# nginx не може їх прочитати і віддає 403 (так лягла /admin/ 28.08.2026).
# Статика публічна, тому режим доступу проставляємо явно.
chmod -R a+rX "$RELEASE_DIR"
chcon -R -t httpd_sys_content_t "$RELEASE_DIR" 2>/dev/null || true

NEXT="$LIVE.next"
rm -f -- "$NEXT"
ln -s "$RELEASE_DIR" "$NEXT"
if [ -L "$LIVE" ]; then
  mv -Tf -- "$NEXT" "$LIVE"
else
  LEGACY="$RELEASES/legacy-$(date +%Y%m%d-%H%M%S)"
  mv -- "$LIVE" "$LEGACY"
  mv -Tf -- "$NEXT" "$LIVE"
fi

# Keep the current release plus one rollback point (звужено 28.08.2026 через диск).
# Legacy first-boot trees
# are retained by age and are not touched by this prune.
mapfile -t OLD_RELEASES < <(
  find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -name '[0-9a-f]*' -printf '%T@ %p\n' |
    sort -nr | awk 'NR > 2 { $1=""; sub(/^ /, ""); print }'
)
for old in "${OLD_RELEASES[@]}"; do
  [ -n "$old" ] && rm -rf -- "$old"
done

# ── Сповістити пошуковики ────────────────────────────────────────────
# Жоден із цих викликів не має права зламати викат: сайт уже розгорнуто,
# і невдале сповіщення це не привід повертати попередню збірку. Тому
# помилки лише пишуться в журнал.
INDEXNOW_KEY="b7f3d9a14c2e48f0b6d5a83e1c7f9024"
URL_LIST="$LIVE/indexnow-urls.txt"
if [ -f "$URL_LIST" ]; then
  URLS_JSON=$(awk 'NF{printf "%s\"%s\"", (NR>1?",":""), $0}' "$URL_LIST")
  BODY="{\"host\":\"eprisjournal.com\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"https://eprisjournal.com/$INDEXNOW_KEY.txt\",\"urlList\":[$URLS_JSON]}"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 25 -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" -d "$BODY" 2>/dev/null || echo fail)
  log "IndexNow: $CODE ($(grep -c . "$URL_LIST") адрес)"
fi
curl -s -o /dev/null -m 15 "https://www.bing.com/ping?sitemap=https%3A%2F%2Feprisjournal.com%2Fsitemap.xml" 2>/dev/null || true

log "deployed $RELEASE_SHA ✓"

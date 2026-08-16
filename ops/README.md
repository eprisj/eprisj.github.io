# ops

The scripts that put this repository on the server. They run from `/opt` on the
VPS; these are the versioned copies, and the two must be kept in step by hand.

| file | server path | run by |
|---|---|---|
| `eprisjournal-autopull.sh` | `/opt/eprisjournal-autopull.sh` | cron, every 2 minutes |
| `deploy-eprisjournal.sh` | `/opt/deploy-eprisjournal.sh` | the autopull script, on a new commit |

They were server-only until 2026-08-16, which is the same drift the deploy
script itself guards against for `admin/*`: a file that exists in exactly one
place, with no history, and no way to tell what changed it. The copies landed
here after a deploy shipped a stale build without saying so.

## The failure that is now guarded against

`npx vite build && node scripts/generate-og-pages.mjs` looks like it stops the
script when the build fails. It does not: `set -e` is ignored for every command
of an AND-OR list except the last one. The build died with a V8 heap OOM (node
sizes its old space from RAM, ~870MB on a 1.7GB box, and this build peaks just
above that), the script carried on, rsynced the PREVIOUS `dist/` over the
webroot and logged `done ✓`. The site served a stale build for hours while the
log said every deploy had succeeded.

Now: the two commands are separate, the build gets `--max-old-space-size=1400`
(the box has 2GB of swap to absorb the peak), and nothing is rsynced unless
`dist/index.html` exists and was written in the last ten minutes.

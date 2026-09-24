#!/usr/bin/env bash
# Ships the working tree (tracked + untracked, minus .gitignore'd files) to the VPS and rebuilds.
# Usage: deploy/deploy.sh            (server .env must already exist in /docker/clawd/deploy/.env)
set -euo pipefail
HOST="${CLAWD_SSH:-root@72.61.16.145}"
DIR=/docker/clawd
cd "$(dirname "$0")/.."
git ls-files --cached --others --exclude-standard | grep -v '^animations/' | rsync -az --files-from=- ./ "$HOST:$DIR/"
ssh "$HOST" "cd $DIR/deploy && docker compose up -d --build && docker image prune -f >/dev/null"
echo "Deployed. Logs: ssh $HOST 'cd $DIR/deploy && docker compose logs -f'"

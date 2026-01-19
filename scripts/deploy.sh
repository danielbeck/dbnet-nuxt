#!/usr/bin/env bash
# deploy.sh — safe deploy for dbnet-nuxt
# Usage:
#   ./scripts/deploy.sh

set -euo pipefail

## Remote target copied from the original dbnet repo
REMOTE_USER_AND_HOST="u79456718@home557350892.1and1-data.host"
REMOTE_PATH="db"
REMOTE="${REMOTE_USER_AND_HOST}:${REMOTE_PATH}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
REMOTE_BACKUP="${REMOTE}_old_${TIMESTAMP}"


# SSH ControlMaster options for persistent connection
SSH_OPTS="-o ControlMaster=auto -o ControlPersist=10m -o ControlPath=~/.ssh/cm-%r@%h:%p"


# Dry-run first (shows files that would be added/updated/removed)
echo "--- DRY RUN (what would change; includes removals) ---"
rsync -e "ssh $SSH_OPTS" -avz --itemize-changes --dry-run --delete dist/ "${REMOTE}/"
rsync -e "ssh $SSH_OPTS" -avz --itemize-changes --dry-run --delete public/api/ "${REMOTE}/api/"


read -p "Proceed with real deploy? [y/N] " yn2
case "$yn2" in
  [Yy]* ) ;;
  * ) echo "Aborted."; exit 1;;
esac



# Sync frontend build
echo "Syncing local dist/ to remote ${REMOTE} (will add/update and remove remote files not present locally)..."
rsync -e "ssh $SSH_OPTS" -avz --delete dist/ "${REMOTE}/"

# Sync API scripts
echo "Syncing local public/api/ to remote ${REMOTE}/api/ (will add/update and remove remote files not present locally)..."
rsync -e "ssh $SSH_OPTS" -avz --delete public/api/ "${REMOTE}/api/"


if [ $? -eq 0 ]; then
  echo "Deploy successful. No remote backup was created by this script."
else
  echo "Deploy failed during rsync — remote state may need manual recovery." >&2
  exit 3
fi

exit 0

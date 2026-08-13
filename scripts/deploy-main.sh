#!/usr/bin/env bash
# Deployed by .github/workflows/deploy-main.yml (copied into the deploy bundle).
# The GitHub workflow only invokes `bash "$MAIN_DEPLOY_PATH/.deploy/deploy-main.sh"`,
# so the server's login shell (possibly fish) never parses this file.
set -euo pipefail

MAIN_DEPLOY_PATH="${MAIN_DEPLOY_PATH:?missing MAIN_DEPLOY_PATH}"

# pm2 usually lives under an nvm-managed node. Load nvm (bash-style) if
# present, otherwise rely on the system PATH.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
command -v pm2 >/dev/null 2>&1 || {
  echo "!! pm2 not found in PATH (checked nvm at $NVM_DIR)" >&2
  exit 1
}

echo "===== Start main deployment ====="
echo "Start time: $(date '+%Y-%m-%d %H:%M:%S')"

mkdir -p "$MAIN_DEPLOY_PATH"
cd "$MAIN_DEPLOY_PATH"
echo "Working directory: $(pwd)"

# Never touch the live app until the new bundle is proven complete.
if [ ! -d .deploy/.output ]; then
  echo "!! Deploy bundle is incomplete, aborting. Live app untouched." >&2
  exit 1
fi

rm -rf .output
mv .deploy/.output ./
rm -rf .deploy

if pm2 describe grey-flowers >/dev/null 2>&1; then
  pm2 reload grey-flowers --update-env
else
  pm2 startOrReload ecosystem.config.cjs --update-env
fi
pm2 save

sleep 3

echo ""
echo "===== Service status ====="
pm2 status grey-flowers

echo ""
echo "===== Main deployment finished ====="
echo "End time: $(date '+%Y-%m-%d %H:%M:%S')"

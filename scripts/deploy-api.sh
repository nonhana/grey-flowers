#!/usr/bin/env bash
# Deployed by .github/workflows/deploy-api.yml (copied into the deploy bundle).
# The GitHub workflow only invokes `bash "$API_DEPLOY_PATH/.deploy/deploy-api.sh"`,
# so the server's login shell (possibly fish) never parses this file.
set -euo pipefail

API_DEPLOY_PATH="${API_DEPLOY_PATH:?missing API_DEPLOY_PATH}"

# pm2 usually lives under an nvm-managed node. Load nvm (bash-style) if
# present, otherwise rely on the system PATH.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
command -v pm2 >/dev/null 2>&1 || {
  echo "!! pm2 not found in PATH (checked nvm at $NVM_DIR)" >&2
  exit 1
}

echo "===== Start api deployment ====="
echo "Start time: $(date '+%Y-%m-%d %H:%M:%S')"

cd "$API_DEPLOY_PATH"
echo "Working directory: $(pwd)"

# Never touch the live app until the new bundle is proven complete.
# drone-scp extracts a tar stream — a partial upload is possible.
if [ ! -d .deploy/dist ] || [ ! -d .deploy/node_modules ] || [ ! -f .deploy/package.json ]; then
  echo "!! Deploy bundle is incomplete, aborting. Live app untouched." >&2
  exit 1
fi

rm -rf dist node_modules package.json
mv .deploy/dist ./
mv .deploy/node_modules ./
mv .deploy/package.json ./
rm -rf .deploy

pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

sleep 3

echo ""
echo "===== Service status ====="
pm2 status greyflowers-api

echo ""
echo "===== Health check ====="
API_HEALTH_URL="http://127.0.0.1:${API_PORT:-2408}/"
if curl -fsS --max-time 5 "$API_HEALTH_URL" >/dev/null; then
  echo "Health check passed: $API_HEALTH_URL"
else
  echo "Health check FAILED: $API_HEALTH_URL" >&2
  pm2 logs greyflowers-api --lines 80 --nostream || true
  exit 1
fi

echo ""
echo "===== Api deployment finished ====="
echo "End time: $(date '+%Y-%m-%d %H:%M:%S')"

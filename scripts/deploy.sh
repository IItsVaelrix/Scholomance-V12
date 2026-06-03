#!/usr/bin/env bash
#
# One-command deploy for Scholomance.
#
# Builds the production bundle, then ships:
#   • the SPA  → Cloudflare Pages   (serves ./dist)
#   • the API  → Fly.io             (Docker; Fly runs its own build inside the image)
#
# The local `npm run build` is what Cloudflare Pages uploads. Fly rebuilds from the
# Dockerfile independently, so this script's build is primarily for the Pages deploy.
#
# Usage:
#   scripts/deploy.sh                 # build, then deploy Cloudflare + Fly
#   scripts/deploy.sh --skip-build    # reuse the existing ./dist
#   scripts/deploy.sh --cf-only       # Cloudflare Pages only
#   scripts/deploy.sh --fly-only      # Fly only
#   scripts/deploy.sh --help
#
# Config (override via env):
#   CF_PROJECT  (default: scholomance-v12)
#   CF_BRANCH   (default: master)
#   FLY_APP     (default: scholomance-v12)
#   DIST_DIR    (default: ./dist)
#
set -euo pipefail

CF_PROJECT="${CF_PROJECT:-scholomance-v12}"
CF_BRANCH="${CF_BRANCH:-master}"
FLY_APP="${FLY_APP:-scholomance-v12}"
DIST_DIR="${DIST_DIR:-./dist}"

# Always operate from the repo root (this script lives in scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

DO_BUILD=1
DO_CF=1
DO_FLY=1

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,33p' "$0" | sed 's/^#\{0,1\} \{0,1\}//'
  exit 0
}

for arg in "$@"; do
  case "$arg" in
    --skip-build) DO_BUILD=0 ;;
    --cf-only)    DO_FLY=0 ;;
    --fly-only)   DO_BUILD=0; DO_CF=0 ;;
    --no-cf)      DO_CF=0 ;;
    --no-fly)     DO_FLY=0 ;;
    -h|--help)    usage ;;
    *) die "Unknown option: $arg (try --help)" ;;
  esac
done

# ── Build ────────────────────────────────────────────────────────────────────
if [ "$DO_BUILD" -eq 1 ]; then
  log "Building production bundle (npm run build)…"
  npm run build || die "Build failed — not deploying."
  ok "Build complete → ${DIST_DIR}"
else
  log "Skipping build (--skip-build)."
fi

# ── Cloudflare Pages (SPA) ───────────────────────────────────────────────────
if [ "$DO_CF" -eq 1 ]; then
  [ -d "${DIST_DIR}" ] || die "${DIST_DIR} not found — run without --skip-build first."
  log "Deploying SPA → Cloudflare Pages (project: ${CF_PROJECT}, branch: ${CF_BRANCH})…"
  npx wrangler pages deploy "${DIST_DIR}" \
    --project-name "${CF_PROJECT}" \
    --branch "${CF_BRANCH}" \
    --commit-dirty=true \
    || die "Cloudflare deploy failed. If it's an auth error (code 10000), run:  npx wrangler login"
  ok "Cloudflare Pages deployed."
fi

# ── Fly.io (API) ─────────────────────────────────────────────────────────────
if [ "$DO_FLY" -eq 1 ]; then
  command -v flyctl >/dev/null 2>&1 || die "flyctl not found in PATH."
  log "Deploying API → Fly (app: ${FLY_APP})… (this builds the Docker image; can take several minutes)"
  flyctl deploy --remote-only --app "${FLY_APP}" \
    || die "Fly deploy failed. Check:  flyctl auth whoami   and   flyctl status --app ${FLY_APP}"
  ok "Fly deployed → https://${FLY_APP}.fly.dev/"
fi

log "Deploy finished."

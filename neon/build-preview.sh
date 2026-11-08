#!/usr/bin/env bash
set -euo pipefail

# Build a self-contained, public-only static preview for the Neon migration branch.
# Never publish node_modules, Git history, SQL migrations, server source, or env files.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

mkdir -p public-qa/rinlo2
for file in ./*.js ./*.svg ./*.webmanifest ./*.html; do
  test -f "$file" && cp "$file" public-qa/
done
cp -R rinlo2/. public-qa/rinlo2/

(
  cd neon
  npm install --no-package-lock --ignore-scripts --no-fund --no-audit
  npm run build:browser
)
cp rinlo2/neon-auth-qa.bundle.js public-qa/rinlo2/neon-auth-qa.bundle.js

test -s public-qa/rinlo2/neon-auth-qa.bundle.js
test -f public-qa/rinlo2/neon-auth-qa.html
echo "RINLO_NEON_BROWSER_QA_BUILD=PASS"

#!/usr/bin/env bash
# Stamp every local asset reference with the current build id.
#
# GitHub Pages caches assets, so a browser that already has the page can
# otherwise end up running a NEW script against an OLD stylesheet — which
# is exactly what made the admin gate render behind the board. Bumping the
# stamp on every deploy makes each build a distinct URL.
#
# Run before committing:  ./bump-build.sh && git add -A && git commit
set -euo pipefail
cd "$(dirname "$0")"
BUILD="$(date -u +%Y%m%d%H%M)"

for f in index.html present.html admin.html qr-gen.html; do
  # strip any existing stamp, then add the new one to local assets only
  perl -0pi -e 's/(\b(?:src|href)="(?:assets|data)\/[^"?]+)\?v=[0-9]+/$1/g' "$f"
  perl -0pi -e 's/(\b(?:src|href)="(?:assets|data)\/[^"?]+)"/$1?v='"$BUILD"'"/g' "$f"
done

# the JSON data files are fetched from JS, so stamp them there too
perl -0pi -e 's/"data\/portfolios\.json(?:\?v=[0-9]+)?"/"data\/portfolios.json?v='"$BUILD"'"/' assets/base-loader.js
perl -0pi -e 's/"data\/products\.json(?:\?v=[0-9]+)?"/"data\/products.json?v='"$BUILD"'"/' assets/base-loader.js

echo "build $BUILD stamped"

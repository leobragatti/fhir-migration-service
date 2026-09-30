#!/bin/sh
# node_modules lives in a Docker volume that outlives image rebuilds. If it was installed
# from a different package-lock.json than the current one, reinstall before starting.
set -e

want=$(sha256sum package-lock.json | cut -d' ' -f1)
have=$(cat node_modules/.package-lock.sha256 2>/dev/null || true)

if [ "$want" != "$have" ]; then
  echo "package-lock.json changed; reinstalling dependencies..."
  npm ci
  echo "$want" > node_modules/.package-lock.sha256
fi

exec "$@"

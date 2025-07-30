#!/bin/bash

set -e

pnpm run build

# move all content to /core directory
mkdir -p dist/core
mv dist/* dist/core/ 2>/dev/null || true

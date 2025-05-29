#!/usr/bin/env node

// This script enables running Jest with TypeScript configuration files
// while suppressing the warnings about experimental loaders and fs.Stats.
//
// We also run Jest with --no-watchman by default to avoid watchman warnings
// related to file watching in the monorepo structure with multiple packages.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'child_process';

// Register ts-node to handle TypeScript
register('ts-node/esm', pathToFileURL('./'));

// Run Jest with the arguments passed to this script
const args = process.argv.slice(2);

const result = spawnSync('node_modules/.bin/jest', args, {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: {
    ...process.env,
    // Suppress specific warnings
    NODE_NO_WARNINGS: '1',
  },
});

process.exit(result.status || 0);

/* eslint-disable jsdoc/require-jsdoc */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { GenericPackageJson } from './types.ts';

export function detectPackageManager(rootDir: string): 'npm' | 'yarn' | 'pnpm' {
  if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(rootDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(rootDir, 'package-lock.json'))) {
    return 'npm';
  }
  return 'npm'; // default fallback
}

export function readPackageJson(rootDir: string): GenericPackageJson {
  const packageJsonPath = join(rootDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found in the specified directory');
  }

  const content = readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

export function hasPackageJson(rootDir: string): boolean {
  return existsSync(join(rootDir, 'package.json'));
}

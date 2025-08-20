/* eslint-disable jsdoc/require-jsdoc */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { type GenericPackageJson, PackageManager } from './types.ts';

export function detectPackageManager(rootDir: string): PackageManager {
  if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) {
    return PackageManager.PNPM;
  }
  if (existsSync(join(rootDir, 'yarn.lock'))) {
    return PackageManager.YARN;
  }
  if (existsSync(join(rootDir, 'package-lock.json'))) {
    return PackageManager.NPM;
  }
  return PackageManager.NPM; // default fallback
}

export function readPackageJson(rootDir: string): GenericPackageJson {
  const packageJsonPath = join(rootDir, 'package.json');
  const content = readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

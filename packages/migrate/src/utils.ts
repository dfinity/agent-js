/* eslint-disable jsdoc/require-jsdoc */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DEPENDENCY_MAPPINGS } from './constants.ts';

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

type GenericPackageJson = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};

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

export function getDependenciesToRemove(packageJson: GenericPackageJson): string[] {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  return Object.keys(allDeps).filter(
    dep =>
      dep.startsWith('@dfinity/') &&
      DEPENDENCY_MAPPINGS.find(mapping => mapping.oldPackage === dep),
  );
}

export function hasDfinityDependencies(packageJson: GenericPackageJson): boolean {
  return getDependenciesToRemove(packageJson).length > 0;
}

export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function readGitignorePatterns(rootDir: string): string[] {
  const gitignorePath = join(rootDir, '.gitignore');

  if (!existsSync(gitignorePath)) {
    return [];
  }

  try {
    const content = readFileSync(gitignorePath, 'utf-8');
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(pattern => {
        // Convert gitignore patterns to glob patterns
        if (pattern.startsWith('/')) {
          // Absolute path from root
          return `**/${pattern.slice(1)}/**`;
        } else if (pattern.endsWith('/')) {
          // Directory
          return `**/${pattern}**`;
        } else if (pattern.includes('/')) {
          // Path with slashes
          return `**/${pattern}`;
        } else {
          // Simple filename/pattern
          return `**/${pattern}`;
        }
      });

    return lines;
  } catch (error) {
    console.warn(`Warning: Could not read .gitignore file: ${error}`);
    return [];
  }
}

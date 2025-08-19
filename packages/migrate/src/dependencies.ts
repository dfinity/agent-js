/* eslint-disable jsdoc/require-jsdoc */

import { DEPENDENCY_MAPPINGS } from './constants.ts';
import type { GenericPackageJson } from './types.ts';

type DependencyWithVersion = [string, string];

export function getDependenciesToRemove(
  packageJson: GenericPackageJson,
): Array<DependencyWithVersion> {
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  return Object.entries(allDeps).filter(
    ([depName]) =>
      depName.startsWith('@dfinity/') &&
      DEPENDENCY_MAPPINGS.find(mapping => mapping.oldPackage === depName),
  );
}

export function hasDfinityDependencies(packageJson: GenericPackageJson): boolean {
  return getDependenciesToRemove(packageJson).length > 0;
}

export function isV2Version(version: string): boolean {
  // Remove range operators and extract the major version
  // Handle operators like ^, ~, >=, <=, >, <, =, etc.
  const cleanVersion = version.replace(/^[\^~>=<]+\s*/, '');
  const majorVersion = parseInt(cleanVersion.split('.')[0], 10);
  return majorVersion === 2;
}

export function hasV2Dependencies(parsedDependencies: Array<DependencyWithVersion>): boolean {
  return parsedDependencies.some(([, depVersion]) => isV2Version(depVersion));
}

export function printDependency([depName, depVersion]: DependencyWithVersion): string {
  return `${depName}@${depVersion}`;
}

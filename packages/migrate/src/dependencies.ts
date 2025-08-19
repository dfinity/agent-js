/* eslint-disable jsdoc/require-jsdoc */

import { DEPENDENCY_MAPPINGS } from './constants.ts';
import type { GenericPackageJson, DependencyInfo } from './types.ts';

function shouldRemoveDependency(depName: string): boolean {
  return (
    depName.startsWith('@dfinity/') &&
    DEPENDENCY_MAPPINGS.some(mapping => mapping.oldPackage === depName)
  );
}

export function getDependenciesToRemove(packageJson: GenericPackageJson): DependencyInfo[] {
  const result: DependencyInfo[] = [];

  // Check dependencies (highest priority)
  if (packageJson.dependencies) {
    for (const [depName, depVersion] of Object.entries(packageJson.dependencies)) {
      if (shouldRemoveDependency(depName)) {
        result.push({
          name: depName,
          version: depVersion,
          type: 'dependencies',
        });
      }
    }
  }

  // Check peerDependencies (medium priority)
  if (packageJson.peerDependencies) {
    for (const [depName, depVersion] of Object.entries(packageJson.peerDependencies)) {
      if (shouldRemoveDependency(depName) && !result.find(dep => dep.name === depName)) {
        result.push({
          name: depName,
          version: depVersion,
          type: 'peerDependencies',
        });
      }
    }
  }

  // Check devDependencies (lowest priority)
  if (packageJson.devDependencies) {
    for (const [depName, depVersion] of Object.entries(packageJson.devDependencies)) {
      if (shouldRemoveDependency(depName) && !result.find(dep => dep.name === depName)) {
        result.push({
          name: depName,
          version: depVersion,
          type: 'devDependencies',
        });
      }
    }
  }

  return result;
}

export function hasDfinityDependencies(packageJson: GenericPackageJson): boolean {
  return getDependenciesToRemove(packageJson).length > 0;
}

function isV2Version(version: string): boolean {
  // Remove range operators and extract the major version
  // Handle operators like ^, ~, >=, <=, >, <, =, etc.
  const cleanVersion = version.replace(/^[\^~>=<]+\s*/, '');
  const majorVersion = parseInt(cleanVersion.split('.')[0], 10);
  return majorVersion === 2;
}

export function hasV2Dependencies(dependencies: DependencyInfo[]): boolean {
  return dependencies.some(dep => isV2Version(dep.version));
}

export function printDependency(dep: DependencyInfo): string {
  return `${dep.name}@${dep.version}`;
}

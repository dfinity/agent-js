import type { DependencyMapping } from './types.ts';

export const DEPENDENCY_MAPPINGS: DependencyMapping[] = [
  {
    oldPackage: '@dfinity/agent',
    newSubmodule: '@icp-sdk/core/agent',
    description: 'Agent functionality for Internet Computer',
  },
  {
    oldPackage: '@dfinity/candid',
    newSubmodule: '@icp-sdk/core/candid',
    description: 'Candid interface definition language',
  },
  {
    oldPackage: '@dfinity/identity',
    newSubmodule: '@icp-sdk/core/identity',
    description: 'Identity management and authentication',
  },
  {
    oldPackage: '@dfinity/identity-secp256k1',
    newSubmodule: '@icp-sdk/core/identity-secp256k1',
    description: 'Secp256k1 identity support',
  },
  {
    oldPackage: '@dfinity/principal',
    newSubmodule: '@icp-sdk/core/principal',
    description: 'Principal identifier for Internet Computer',
  },
];

export const NEW_CORE_PACKAGE = '@icp-sdk/core';

export const DEFAULT_FILES_PATTERNS = [
  '**/*.ts',
  '**/*.js',
  '**/*.tsx',
  '**/*.jsx',
  '**/*.mjs',
  '**/*.cjs',
  '**/*.mts',
  '**/*.svelte',
  '**/*.vue',
];

export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.output/**',
];

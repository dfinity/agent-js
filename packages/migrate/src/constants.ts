import type { DependencyMapping } from './types.ts';

export const DEPENDENCY_MAPPINGS: DependencyMapping[] = [
  {
    oldPackage: '@dfinity/agent',
    newSubmodule: '@icp-sdk/core/agent',
  },
  {
    oldPackage: '@dfinity/candid',
    newSubmodule: '@icp-sdk/core/candid',
  },
  {
    oldPackage: '@dfinity/identity',
    newSubmodule: '@icp-sdk/core/identity',
  },
  {
    oldPackage: '@dfinity/identity-secp256k1',
    newSubmodule: '@icp-sdk/core/identity-secp256k1',
  },
  {
    oldPackage: '@dfinity/principal',
    newSubmodule: '@icp-sdk/core/principal',
  },
];

export const NEW_CORE_PACKAGE = '@icp-sdk/core@beta';

export const V3_MIGRATION_GUIDE_URL = 'https://js.icp.build/core/release-notes/v300/';

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

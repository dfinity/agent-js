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
    newSubmodule: '@icp-sdk/core/identity/secp256k1',
  },
  {
    oldPackage: '@dfinity/principal',
    newSubmodule: '@icp-sdk/core/principal',
  },
];

// TODO: update to @icp-sdk/core once the package is published
export const NEW_CORE_PACKAGE = '@icp-sdk/core@beta';

// TODO: update path to /core/v3.2/release-notes/v300/ once the new docs are published
export const V3_RELEASE_NOTES_URL = 'https://js.icp.build/core/release-notes/v300/';

export const V4_UPGRADING_GUIDE_URL = 'https://js.icp.build/core/latest/upgrading/';

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

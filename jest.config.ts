import type { Config } from 'jest';
import { baseConfig } from './jest.config.base';

// Using .ts files for Jest configs might cause issues related to ts-node.
// This issue gives an overview of the problems: https://github.com/jestjs/jest/issues/11453, even if it's closed.
// We've now converted to TypeScript files but keep this comment for reference.

const config: Config = {
  ...baseConfig,
  projects: ['<rootDir>/packages/*'],
  moduleDirectories: ['node_modules'],
  collectCoverageFrom: ['<rootDir>/packages/*/src/**/*.{ts,tsx}'],
  rootDir: '.', // Jest sets this automatically, but let's be explicit
};

export default config;

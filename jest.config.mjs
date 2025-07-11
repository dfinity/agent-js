// Using .ts files for Jest configs gives a lot of problems, especially related to ts-node.
// This issue gives an overview of the problems: https://github.com/jestjs/jest/issues/11453, even if it's closed.
// For this reason, we're using .mjs files instead.
// We need the .mjs extension to make sure that the file is parsed as a module in all the Node.js versions we support.

import { baseConfig } from './jest.config.base.js';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  projects: ['<rootDir>/packages/*'],
  moduleDirectories: ['node_modules'],
  collectCoverageFrom: ['<rootDir>/packages/*/src/**/*.{ts,tsx}'],
  rootDir: '.', // Jest sets this automatically, but let's be explicit
};

export default config;

import { baseConfig } from '../../jest.config.base.js';

const packageName = 'candid';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  roots: [`<rootDir>/packages/${packageName}`],
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`<rootDir>/packages/${packageName}/test-setup.ts`],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  rootDir: '../..',
};

export default config;

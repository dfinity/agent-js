import { baseConfig } from '../../jest.config.base.js';

const packageName = 'agent';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  roots: [`<rootDir>/packages/${packageName}`],
  fakeTimers: { enableGlobally: true },
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`<rootDir>/packages/${packageName}/test-setup.ts`],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  prettierPath: null, // see https://jestjs.io/docs/configuration/#prettierpath-string
  rootDir: '../..',
};

export default config;

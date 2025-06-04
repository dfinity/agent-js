import { baseConfig } from '../../jest.config.base.js';

const packageName = 'identity-secp256k1';

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
  rootDir: '../..',
  prettierPath: null,
};

export default config;

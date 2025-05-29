import { baseConfig } from '../../jest.config.base.js';
import { createDefaultEsmPreset } from 'ts-jest';

const packageName = 'assets';

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
  ...createDefaultEsmPreset({
    tsconfig: '<rootDir>/tsconfig.test.json',
  }),
};

export default config;

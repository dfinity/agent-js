import { baseConfig } from '../../jest.config.base.js';
import { Crypto } from '@peculiar/webcrypto';
import { createDefaultPreset } from 'ts-jest';

const packageName = 'auth-client';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  ...createDefaultPreset({
    tsconfig: `<rootDir>/packages/${packageName}/tsconfig.test.json`,
  }),
  roots: [`<rootDir>/packages/${packageName}`],
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`<rootDir>/packages/${packageName}/test-setup.ts`],
  testEnvironment: `<rootDir>/packages/${packageName}/FixJSDOMEnvironment.ts`,
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  globals: {
    window: {
      crypto: new Crypto(),
    },
  },
  rootDir: '../..',
};

export default () => config;

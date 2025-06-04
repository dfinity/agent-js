import { baseConfig } from '../../jest.config.base.js';
import { createDefaultPreset } from 'ts-jest';

const packageName = 'use-auth-client';

/** @type {import('jest').Config} */
const config = {
  ...baseConfig,
  ...createDefaultPreset({
    tsconfig: `<rootDir>/packages/${packageName}/tsconfig.test.json`,
  }),
  roots: [`<rootDir>/packages/${packageName}/test`],
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFilesAfterEnv: [`<rootDir>/packages/${packageName}/setupTests.ts`],
  testEnvironment: `<rootDir>/packages/${packageName}/FixJSDOMEnvironment.ts`,
  testMatch: [`<rootDir>/packages/${packageName}/test/**/*.test.tsx`],
  displayName: packageName,
  rootDir: '../..',
};

export default config;

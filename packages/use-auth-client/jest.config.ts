import baseConfig from '../../jest.config.base';
import { createDefaultPreset } from 'ts-jest';
const packageName = 'use-auth-client';

module.exports = {
  ...baseConfig,
  testEnvironment: `<rootDir>/packages/${packageName}/FixJSDOMEnvironment.ts`,
  roots: [`<rootDir>/packages/${packageName}/test`],
  setupFilesAfterEnv: [`<rootDir>/packages/${packageName}/setupTests.ts`],
  rootDir: '../..',
  ...createDefaultPreset({
    tsconfig: `<rootDir>/packages/${packageName}/tsconfig.test.json`,
  }),
};

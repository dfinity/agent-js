import baseConfig from '../../jest.config.base';
import { Crypto } from '@peculiar/webcrypto';
import { createDefaultEsmPreset } from 'ts-jest';
import type { Config } from '@jest/types';

const packageName = 'auth-client';

const config: Config.InitialOptions = {
  ...baseConfig,
  ...createDefaultEsmPreset({
    tsconfig: `<rootDir>/packages/${packageName}/tsconfig.test.json`,
  }),
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

export default config;

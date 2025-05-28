import baseConfig from '../../jest.config.base';
import { createDefaultEsmPreset } from 'ts-jest';
import type { Config } from '@jest/types';

const packageName = 'assets';

const config: Config.InitialOptions = {
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

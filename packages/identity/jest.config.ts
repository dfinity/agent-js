import type { Config } from 'jest';
import { baseConfig } from '../../jest.config.base';

const packageName = 'identity';

const config: Config = {
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

import type { Config } from 'jest';
import { baseConfig } from '../../jest.config.base';

const packageName = 'agent';

const config: Config = {
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
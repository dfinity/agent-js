import type { Config } from '@jest/types';
const config: Config.InitialOptions = {
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/', '/docs/'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  roots: [`<rootDir>/e2e/node`],
  bail: false,
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/e2e/node/`],
  setupFiles: [`<rootDir>/e2e/node/test-setup.ts`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.{ts,tsx}'],
  name: 'e2e/node',
  displayName: 'e2e-node',
  rootDir: '../..',
};

export default config;

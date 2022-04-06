import baseConfig from '../../jest.config.base';
const packageName = 'auth-client';

module.exports = {
  testEnvironment: 'jsdom',
  ...baseConfig,
  bail: false,
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`./test-setup.ts`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  name: packageName,
  displayName: packageName,
  globals: {
    window: {},
  },
};

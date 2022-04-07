import baseConfig from '../../jest.config.base';
const packageName = 'principal';

module.exports = {
  ...baseConfig,
  roots: [`<rootDir>/packages/${packageName}`],
  bail: false,
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`<rootDir>/packages/${packageName}/test-setup.ts`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  name: packageName,
  displayName: packageName,
  rootDir: '../..',
};

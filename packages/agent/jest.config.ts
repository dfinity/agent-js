import baseConfig from '../../jest.config.base';
const packageName = 'agent';

module.exports = {
  ...baseConfig,
  roots: [`<rootDir>/packages/${packageName}`],
  bail: false,
  fakeTimers: { enableGlobally: true },
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`<rootDir>/packages/${packageName}/test-setup.ts`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  rootDir: '../..',
};

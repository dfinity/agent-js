import baseConfig from '../../jest.config.base';
const packageName = 'internal';

module.exports = {
  ...baseConfig,
  roots: [`<rootDir>/packages/${packageName}`],
  fakeTimers: { enableGlobally: true },
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  rootDir: '../..',
};

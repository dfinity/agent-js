import baseConfig from '../../jest.config.base';
import { Crypto } from '@peculiar/webcrypto';
const packageName = 'auth-client';

module.exports = {
  testEnvironment: './FixJSDOMEnvironment.ts',
  ...baseConfig,
  moduleDirectories: ['node_modules'],
  modulePaths: [`<rootDir>/packages/${packageName}/src/`],
  setupFiles: [`./test-setup.ts`],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
  displayName: packageName,
  globals: {
    window: {
      crypto: new Crypto(),
    },
  },
};

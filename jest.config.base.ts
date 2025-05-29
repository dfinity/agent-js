import type { Config } from 'jest';
import { createDefaultPreset } from 'ts-jest';

export const baseConfig: Config = {
  ...createDefaultPreset({
    tsconfig: '<rootDir>/tsconfig.test.json',
  }),
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/', '/docs/'],
  testMatch: ['**/src/**/?(*.)+(spec|test).[jt]s'],
  moduleNameMapper: {
    '^@dfinity/agent$': '<rootDir>/packages/agent/src/index.ts',
    '^@dfinity/assets$': '<rootDir>/packages/assets/src/index.ts',
    '^@dfinity/auth-client$': '<rootDir>/packages/auth-client/src/index.ts',
    '^@dfinity/candid$': '<rootDir>/packages/candid/src/index.ts',
    '^@dfinity/identity$': '<rootDir>/packages/identity/src/index.ts',
    '^@dfinity/identity-secp256k1$': '<rootDir>/packages/identity-secp256k1/src/index.ts',
    '^@dfinity/principal$': '<rootDir>/packages/principal/src/index.ts',
  },
};

import type { Config } from '@jest/types';
import { createDefaultPreset } from 'ts-jest';

const config: Config.InitialOptions = {
  ...createDefaultPreset({
    tsconfig: '<rootDir>/tsconfig.test.json',
  }),
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/', '/docs/'],
  testMatch: ['**/src/**/?(*.)+(spec|test).[jt]s?(x)'],
};

export default config;

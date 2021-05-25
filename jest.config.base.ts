import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/lib/', '/dist/', '/docs/'],
  testMatch: ['**/src/**/?(*.)+(spec|test).[jt]s?(x)'],
};

export default config;

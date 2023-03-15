// jest.config.js
import baseConfig from './jest.config.base';
export default {
  ...baseConfig,
  projects: ['<rootDir>/packages/*/jest.config.ts'],
  moduleNameMapper: {
    '.json$': 'identity-obj-proxy',
  },
  moduleDirectories: ['node_modules'],
  collectCoverageFrom: ['<rootDir>/packages/*/src/**/*.{ts,tsx}'],
};

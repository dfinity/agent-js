// jest.config.js
import * as baseConfig from "./jest.config.base";

module.exports = {
  ...baseConfig,
  projects: ["<rootDir>/packages/*/jest.config.js"],
  collectCoverageFrom: ["<rootDir>/packages/*/src/**/*.{ts,tsx}"],
};

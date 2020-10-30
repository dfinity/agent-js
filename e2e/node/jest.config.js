module.exports = {
  bail: false,
  testTimeout: 60000,
  //globalSetup: './setup',
  //globalTeardown: './teardown',
  testEnvironment: 'node',
  setupFiles: [
    "./test-setup",
  ],
  setupFilesAfterEnv: [
    "jest-expect-message",
  ],
  // Since we're running e2e tests, ALL typescript files are up for grab.
  testMatch: [
    "**/*.ts"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/utils/",
    "/canisters/",
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  }
};

module.exports = {
  bail: false,
  setupFiles: [
    "./test-setup",
  ],
  setupFilesAfterEnv: [
    "jest-expect-message",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/ts-out/"
  ],
  transform: {
    "^.+\\.ts$": "ts-jest"
  },
  preset: 'ts-jest/presets/js-with-ts',
};

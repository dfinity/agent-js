/* eslint-env node */
module.exports = {
  bail: false,
  setupFiles: ["./test-setup"],
  setupFilesAfterEnv: ["jest-expect-message"],
  testPathIgnorePatterns: ["/node_modules/", "/out/", "\\.*\\.js$"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};

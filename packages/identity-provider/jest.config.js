module.exports = {
  bail: false,
  setupFiles: [
    "./test-setup",
  ],
  setupFilesAfterEnv: [
    "jest-expect-message",
    "./node_modules/jest-enzyme/lib/index.js",
    "./src/testing/jest/setupAfterEnv.js",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/out/",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.(tsx?)$",
};

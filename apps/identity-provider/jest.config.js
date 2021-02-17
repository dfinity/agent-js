module.exports = {
  bail: false,
  setupFiles: [
    "./test-setup",
  ],
  setupFilesAfterEnv: [
    // "jest-expect-message",
    "jest-enzyme",
  ],
  testEnvironment: "enzyme",
  testEnvironmentOptions: {
    enzymeAdapter: "react16"
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/out/",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: "((\\.|/)(test|spec))\\.(tsx?)$",
};

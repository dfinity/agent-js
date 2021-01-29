module.exports = {
  bail: false,
  setupFiles: ['./test-setup'],
  setupFilesAfterEnv: ['jest-expect-message'],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '\\.js$'],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
};

module.exports = {
  bail: false,
  setupFiles: ['./test-setup'],
  setupFilesAfterEnv: ['jest-expect-message'],
  testPathIgnorePatterns: ['/node_modules/', '/out/', '\\.js$'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleDirectories: ["node_modules", "src/vendor/bls"],
};

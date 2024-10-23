module.exports = {
  preset: 'ts-jest',
  testEnvironment: './FixJSDOMEnvironment.ts',
  roots: ['<rootDir>/test'],
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
};

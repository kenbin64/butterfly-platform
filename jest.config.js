module.exports = {
  testEnvironment: "jsdom",
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.test.js"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  collectCoverageFrom: [
    "app/src/**/*.ts",
    "core/**/*.ts",
    "!app/src/index.ts",
    "!app/src/enhanced-index.ts"
  ],
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  globals: {
    "ts-jest": {
      tsconfig: "../tsconfig.json"
    }
  },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"]
};

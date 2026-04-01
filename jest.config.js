module.exports = {
  testEnvironment: "jsdom",
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.test.js"
  ],
  // Prefer TypeScript sources over stale compiled .js artifacts
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
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
      tsconfig: "./tsconfig.json"
    }
  },
  setupFiles: ["<rootDir>/tests/polyfills.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"]
};

import type { Config } from '@jest/types';

export default async (): Promise<Config.InitialOptions> => ({
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '../',
  clearMocks: true,
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 30000,
  collectCoverageFrom: ['./src/**/*.ts'],
  setupFilesAfterEnv: ['./jest/setup.ts'],
  coverageReporters: ['clover', 'json-summary', 'lcov', 'text'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          importHelpers: true,
        },
      },
    ],
  },
  modulePathIgnorePatterns: [],
});

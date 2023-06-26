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

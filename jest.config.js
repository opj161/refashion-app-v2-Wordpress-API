module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
    '^.+\\.jsx?$': ['babel-jest', {
      presets: ['next/babel']
    }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!lucide-react|recharts|d3-.*|internmap|delaunator|robust-predicates|@babel/runtime)/"
  ]
};

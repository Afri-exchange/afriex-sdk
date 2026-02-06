/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    roots: ['<rootDir>/packages'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@afriex/core/(.*)$': '<rootDir>/packages/core/src/$1',
        '^@afriex/core$': '<rootDir>/packages/core/src/index.ts',
        '^@afriex/customers/(.*)$': '<rootDir>/packages/customers/src/$1',
        '^@afriex/customers$': '<rootDir>/packages/customers/src/index.ts',
        '^@afriex/transactions/(.*)$': '<rootDir>/packages/transactions/src/$1',
        '^@afriex/transactions$': '<rootDir>/packages/transactions/src/index.ts',
        '^@afriex/payment-methods/(.*)$': '<rootDir>/packages/payment-methods/src/$1',
        '^@afriex/payment-methods$': '<rootDir>/packages/payment-methods/src/index.ts',
        '^@afriex/balance/(.*)$': '<rootDir>/packages/balance/src/$1',
        '^@afriex/balance$': '<rootDir>/packages/balance/src/index.ts',
        '^@afriex/rates/(.*)$': '<rootDir>/packages/rates/src/$1',
        '^@afriex/rates$': '<rootDir>/packages/rates/src/index.ts',
        '^@afriex/webhooks/(.*)$': '<rootDir>/packages/webhooks/src/$1',
        '^@afriex/webhooks$': '<rootDir>/packages/webhooks/src/index.ts',
        '^@afriex/sdk/(.*)$': '<rootDir>/packages/sdk/src/$1',
        '^@afriex/sdk$': '<rootDir>/packages/sdk/src/index.ts',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {

                tsconfig: 'tsconfig.base.json',
            },
        ],
    },
};

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
        '^@afriex/transfers/(.*)$': '<rootDir>/packages/transfers/src/$1',
        '^@afriex/transfers$': '<rootDir>/packages/transfers/src/index.ts',
        '^@afriex/wallets/(.*)$': '<rootDir>/packages/wallets/src/$1',
        '^@afriex/wallets$': '<rootDir>/packages/wallets/src/index.ts',
        '^@afriex/recipients/(.*)$': '<rootDir>/packages/recipients/src/$1',
        '^@afriex/recipients$': '<rootDir>/packages/recipients/src/index.ts',
        '^@afriex/rates/(.*)$': '<rootDir>/packages/rates/src/$1',
        '^@afriex/rates$': '<rootDir>/packages/rates/src/index.ts',
        '^@afriex/webhooks/(.*)$': '<rootDir>/packages/webhooks/src/$1',
        '^@afriex/webhooks$': '<rootDir>/packages/webhooks/src/index.ts',
        '^@afriex/banks/(.*)$': '<rootDir>/packages/banks/src/$1',
        '^@afriex/banks$': '<rootDir>/packages/banks/src/index.ts',
    },
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                isolatedModules: true,
                tsconfig: 'tsconfig.base.json',
            },
        ],
    },
};

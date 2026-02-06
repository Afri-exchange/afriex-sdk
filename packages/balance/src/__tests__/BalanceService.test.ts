import { BalanceService } from '../BalanceService';
import { HttpClient } from '@afriex/core';
import { ValidationError } from '@afriex/core';

const mockHttpClient = {
    get: jest.fn(),
} as unknown as HttpClient;

describe('BalanceService', () => {
    let balanceService: BalanceService;

    beforeEach(() => {
        jest.clearAllMocks();
        balanceService = new BalanceService(mockHttpClient);
    });

    describe('getBalance', () => {
        it('should get balances for comma-separated currencies', async () => {
            const mockBalances = { USD: 1000, NGN: 500000 };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockBalances });

            const result = await balanceService.getBalance({ currencies: 'USD,NGN' });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/org/balance', {
                params: { currencies: 'USD,NGN' }
            });
            expect(result).toEqual(mockBalances);
        });

        it('should get balances for array of currencies', async () => {
            const mockBalances = { USD: 1000, GBP: 800 };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockBalances });

            const result = await balanceService.getBalance({ currencies: ['USD', 'GBP'] });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/org/balance', {
                params: { currencies: 'USD,GBP' }
            });
            expect(result).toEqual(mockBalances);
        });

        it('should throw ValidationError when currencies is missing', async () => {
            await expect(balanceService.getBalance({ currencies: '' })).rejects.toThrow(ValidationError);
        });
    });

    describe('getBalanceForCurrency', () => {
        it('should get balance for a single currency', async () => {
            const mockBalances = { USD: 1000 };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockBalances });

            const result = await balanceService.getBalanceForCurrency('USD');

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/org/balance', {
                params: { currencies: 'USD' }
            });
            expect(result).toBe(1000);
        });

        it('should return 0 if currency not found', async () => {
            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: {} });

            const result = await balanceService.getBalanceForCurrency('XYZ');

            expect(result).toBe(0);
        });

        it('should throw ValidationError when currency is empty', async () => {
            await expect(balanceService.getBalanceForCurrency('')).rejects.toThrow(ValidationError);
        });
    });
});

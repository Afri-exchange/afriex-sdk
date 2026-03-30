import { HttpClient, ValidationError } from '@afriex/core';
import { BalanceResponse, GetBalanceParams } from './types';

export class BalanceService {
    private httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }

    /**
     * Get wallet balances for specified currencies
     * GET /org/balance
     * 
     * @param params.currencies - Comma-separated list or array of currency codes
     * @returns Map of currency codes to balance amounts
     */
    async getBalance(params: GetBalanceParams): Promise<Record<string, number>> {
        if (!params.currencies) {
            throw new ValidationError('Currencies are required');
        }

        const currencies = Array.isArray(params.currencies)
            ? params.currencies.join(',')
            : params.currencies;

        const response = await this.httpClient.get<BalanceResponse>('/org/balance', {
            params: { currencies },
        });

        return response.data;
    }

    /**
     * Get balance for a single currency
     * 
     * @param currency - The currency code (e.g., 'USD', 'NGN')
     * @returns The balance amount
     */
    async getBalanceForCurrency(currency: string): Promise<number> {
        if (!currency) {
            throw new ValidationError('Currency is required');
        }

        const balances = await this.getBalance({ currencies: currency });
        return balances[currency] ?? 0;
    }
}

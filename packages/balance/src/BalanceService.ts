import { HttpClient, ValidationError } from "@afriex/core";
import {
  BalanceResponse,
  GetBalanceParams,
  TopUpParams,
  TopUpResponse,
  TopUpTransaction,
} from "./types.js";

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
      throw new ValidationError("Currencies are required");
    }

    const currencies = Array.isArray(params.currencies)
      ? params.currencies.join(",")
      : params.currencies;

    const response = await this.httpClient.get<BalanceResponse>(
      "/org/balance",
      {
        params: { currencies },
      }
    );

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
      throw new ValidationError("Currency is required");
    }

    const balances = await this.getBalance({ currencies: currency });
    return balances[currency] ?? 0;
  }

  /**
   * Top up sandbox balance
   * POST /org/balance/topup
   *
   * Credits the business wallet with the specified amount and currency.
   * **Only available in the sandbox/staging environment.**
   * Calling this endpoint in production will result in a 403 Forbidden error.
   *
   * @param params.amount - A positive number representing the amount to credit
   * @param params.currency - Uppercase 3-letter ISO 4217 currency code (e.g. USD, NGN, GBP)
   * @returns The created transaction record
   */
  async topUpSandbox(params: TopUpParams): Promise<TopUpTransaction> {
    if (!params.amount || params.amount <= 0) {
      throw new ValidationError("amount must be a positive number");
    }
    if (!params.currency) {
      throw new ValidationError("currency is required");
    }

    const response = await this.httpClient.post<TopUpResponse>(
      "/org/balance/topup",
      {
        amount: params.amount,
        currency: params.currency,
      }
    );

    return response.data;
  }
}

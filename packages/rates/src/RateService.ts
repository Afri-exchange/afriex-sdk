import { HttpClient, ValidationError } from "@afriex/core";
import { RatesResponse, GetRatesParams } from "./types";

export class RateService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Get exchange rates for multiple base currencies and target symbols
   * GET /v2/public/rates
   *
   * @param params.fromSymbols - Comma-separated list or array of base currencies (e.g., 'NGN,USD,GBP')
   * @param params.toSymbols - Comma-separated list or array of target currencies (e.g., 'NGN,USD,GBP,KES')
   * @returns Rates response with nested rate maps
   */
  async getRates(params: GetRatesParams): Promise<RatesResponse> {
    if (!params.fromSymbols || !params.toSymbols) {
      throw new ValidationError("Base currencies and symbols are required");
    }

    const fromSymbols = Array.isArray(params.fromSymbols)
      ? params.fromSymbols.join(",")
      : params.fromSymbols;
    const toSymbols = Array.isArray(params.toSymbols)
      ? params.toSymbols.join(",")
      : params.toSymbols;

    return this.httpClient.get<RatesResponse>("/org/rates", {
      params: { fromSymbols, toSymbols },
    });
  }

  /**
   * Get exchange rate between two specific currencies
   *
   * @param baseCurrency - The base currency code (e.g., 'USD')
   * @param targetCurrency - The target currency code (e.g., 'NGN')
   * @returns The exchange rate as a string
   */
  async getRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    if (!baseCurrency || !targetCurrency) {
      throw new ValidationError("Base and target currencies are required");
    }

    const response = await this.getRates({
      fromSymbols: baseCurrency,
      toSymbols: targetCurrency,
    });

    return response.data.rates[baseCurrency]?.[targetCurrency] ?? "0";
  }

  /**
   * Convert an amount from one currency to another
   *
   * @param amount - The amount to convert
   * @param baseCurrency - The source currency code
   * @param targetCurrency - The target currency code
   * @returns The converted amount
   */
  async convert(
    amount: number,
    baseCurrency: string,
    targetCurrency: string
  ): Promise<number> {
    if (amount <= 0) {
      throw new ValidationError("Amount must be greater than 0");
    }

    const rateStr = await this.getRate(baseCurrency, targetCurrency);
    const rate = parseFloat(rateStr);

    return amount * rate;
  }
}

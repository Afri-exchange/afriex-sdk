import { AfriexError, HttpClient, ValidationError } from "@afriex/core";
import { RatesResponse, GetRatesParams } from "./types.js";

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
  async getRates(params: GetRatesParams = {}): Promise<RatesResponse> {
    const fromSymbols = this.normalizeSymbols(params.fromSymbols);
    const toSymbols = this.normalizeSymbols(params.toSymbols);

    const response = await this.httpClient.get<{ data: RatesResponse }>(
      "/org/rates",
      {
        params: { fromSymbols, toSymbols },
      }
    );
    return response.data;
  }

  /**
   * Get exchange rate between two specific currencies
   *
   * @param baseCurrency - The base currency code (e.g., 'USD')
   * @param targetCurrency - The target currency code (e.g., 'NGN')
   * @returns The exchange rate as a string
   * @throws {ApiError} if either currency is not a supported symbol
   * @throws {AfriexError} if the pair is absent from the rates response
   */
  async getRate(baseCurrency: string, targetCurrency: string): Promise<string> {
    if (!baseCurrency || !targetCurrency) {
      throw new ValidationError("Base and target currencies are required");
    }

    const response = await this.getRates({
      fromSymbols: baseCurrency,
      toSymbols: targetCurrency,
    });

    const rate = response.rates[baseCurrency]?.[targetCurrency];

    // Previously this fell back to "0", which silently turned an unavailable
    // rate into a zero-valued conversion. Unsupported symbols are rejected by
    // the API before we get here, so a missing pair means the rate genuinely
    // isn't published — which callers must not mistake for a rate of zero.
    if (rate === undefined) {
      throw new AfriexError(
        `No exchange rate available for ${baseCurrency} to ${targetCurrency}`
      );
    }

    return rate;
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

  private normalizeSymbols(value?: string | string[]): string | undefined {
    if (Array.isArray(value)) {
      return value.join(",");
    }

    return value;
  }
}

/**
 * Rate types matching Afriex Business API
 */

/**
 * Exchange rates data returned by the API
 */
export interface RatesResponse {
  /** Map of base currencies to their exchange rates against target currencies */
  rates: Record<string, Record<string, string>>;
  /** Unix timestamp of the last rate update */
  updatedAt: number;
}

export interface GetRatesParams {
  /** Comma-separated list or array of base currency symbols */
  toSymbols?: string | string[];
  /** Comma-separated list or array of target currency symbols */
  fromSymbols?: string | string[];
}

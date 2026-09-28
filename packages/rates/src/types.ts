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
  /**
   * Comma-separated list or array of target currency symbols. When omitted,
   * every target currency is returned.
   */
  toSymbols?: string | string[];
  /**
   * Comma-separated list or array of base currency symbols. When omitted,
   * only `USD` is used as a base.
   */
  fromSymbols?: string | string[];
}

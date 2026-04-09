/**
 * Rate types matching Afriex Business API
 */

export interface RatesResponse {
  data: {
    rates: Record<string, Record<string, string>>;
    updatedAt: number;
  };
}

export interface GetRatesParams {
  toSymbols: string | string[];
  fromSymbols: string | string[];
}

/**
 * @deprecated A small subset of the currencies the API supports, kept so
 * existing code still compiles. The API accepts many more, and the set
 * depends on the business. Type a currency as `string`.
 */
export type Currency =
  | "USD"
  | "NGN"
  | "GHS"
  | "KES"
  | "UGX"
  | "XOF"
  | "EGP"
  | "PKR"
  | "CAD"
  | "GBP"
  | "EUR";

/**
 * @deprecated A small subset of the countries the API supports, kept so
 * existing code still compiles. Type a country code as `string`.
 */
export type Country =
  | "US" // United States
  | "CA" // Canada
  | "GB" // United Kingdom
  | "NG" // Nigeria
  | "GH" // Ghana
  | "KE" // Kenya
  | "UG" // Uganda
  | "CM" // Cameroon
  | "CI" // Ivory Coast
  | "EG" // Egypt
  | "ET" // Ethiopia
  | "PK" // Pakistan
  | "FR" // France
  | "DE" // Germany
  | "IT" // Italy
  | "ES" // Spain
  | "IE" // Ireland
  | "NL" // Netherlands
  | "RO" // Romania
  | "BE"; // Belgium

/**
 * @deprecated These values are not the API's. A payment method is described
 * by `PaymentChannel` from `@afriex/payment-methods`, whose values are upper
 * case, such as `BANK_ACCOUNT`.
 */
export const PaymentMethod = {
  BANK_ACCOUNT: "bank_account",
  DEBIT_CARD: "debit_card",
  WALLET: "wallet",
  MOBILE_MONEY: "mobile_money",
} as const;
/**
 * @deprecated These values are not the API's. Use `PaymentChannel` from
 * `@afriex/payment-methods`.
 */
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

/**
 * @deprecated The API has no `cursor`. Lists take a zero-based `page` and a
 * `limit`; use the params type of the list you call, such as
 * `ListCustomersParams`.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * @deprecated Not the shape the API returns. A list is
 * `{ data, page, total }`, with no `pagination` object and no `hasMore`. Use
 * the response type of the list you call, such as `CustomerListResponse`.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

/**
 * @deprecated Not the shape the API returns. A response is `{ data }`, with
 * no `success` flag, and the services return `data` itself.
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated No endpoint takes or returns this shape. Amounts are sent
 * beside their currency, as in `sourceAmount` and `sourceCurrency`.
 */
export interface Money {
  amount: number;
  currency: Currency;
}

/**
 * @deprecated No endpoint takes or returns this shape.
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: Country;
}

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

export const PaymentMethod = {
  BANK_ACCOUNT: "bank_account",
  DEBIT_CARD: "debit_card",
  WALLET: "wallet",
  MOBILE_MONEY: "mobile_money",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

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

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: Country;
}

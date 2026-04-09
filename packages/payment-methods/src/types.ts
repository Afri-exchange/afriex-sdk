/**
 * Payment Method types matching Afriex Business API
 */

export type PaymentChannel =
  | "BANK_ACCOUNT"
  | "SWIFT"
  | "MOBILE_MONEY"
  | "UPI"
  | "INTERAC"
  | "WE_CHAT";

export interface PaymentMethodInstitution {
  institutionId?: string;
  institutionName?: string;
  institutionCode?: string;
  institutionAddress?: string;
}

export interface PaymentMethodRecipient {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientName?: string;
}

export interface PaymentMethodTransaction {
  transactionInvoice?: string;
  transactionNarration?: string;
}

export interface PaymentMethod {
  paymentMethodId: string;
  customerId: string;
  institution?: PaymentMethodInstitution;
  transaction?: PaymentMethodTransaction;
  recipient?: PaymentMethodRecipient;
  channel: PaymentChannel;
  countryCode: string;
  accountName: string;
  accountNumber: string;
  meta?: Record<string, unknown>;
}

export interface CreatePaymentMethodRequest {
  channel: PaymentChannel;
  /**
   *The capability of this payment method. `DEPOSIT` means funds can be pulled from this method (e.g. charge/collect from the customer). `WITHDRAW` means funds can be sent to this method (e.g. pay out to the customer). If omitted, defaults to `WITHDRAW`.
   */
  type?: "WITHDRAW" | "DEPOSIT";
  customerId: string;
  accountName: string;
  accountNumber: string;
  countryCode: string;
  institution: PaymentMethodInstitution;
  recipient?: PaymentMethodRecipient;
  transaction?: PaymentMethodTransaction;
}

export interface ListPaymentMethodsParams {
  page?: number;
  limit?: number;
}

export interface PaymentMethodListResponse {
  data: PaymentMethod[];
  page: number;
  total: number;
}

export interface Institution {
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  institutionAddress?: string;
}

export interface ResolveAccountResponse {
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  recipientName?: string;
}
export interface InstitutionCodesResponse {
  bankName: string;
}

export interface GetInstitutionsParams {
  channel: PaymentChannel;
  countryCode: string;
}

export interface ResolveAccountParams {
  channel: "MOBILE_MONEY" | "BANK_ACCOUNT";
  accountNumber: string;
  institutionCode?: string;
  countryCode: string;
}
export interface InstitutionCodesParams {
  searchTerm: string;
  country: "US";
  codeType: "swift_code" | "routing_number";
}
export interface CryptoWallet {
  address: string;
  network: string;
}

export interface CryptoWalletResponse {
  data: CryptoWallet[];
  total: number;
  page: number;
}

export interface GetCryptoWalletParams {
  asset: "USDT" | "USDC";
  customerId?: string;
}

export interface GetVirtualAccountParams {
  currency: "USD" | "NGN" | "KES" | "GBP" | "EUR";
  amount?: number;
  customerId?: string;
  type: "VIRTUAL_ACCOUNT" | "POOL_ACCOUNT";
  reference?: string;
  country?: string;
}

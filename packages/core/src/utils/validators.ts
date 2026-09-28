import { Currency, Country } from "../types/common.js";

/**
 * @deprecated A small subset of the currencies the API supports. Do not use
 * it to decide whether a currency is valid: the API accepts many more. Read
 * the currencies a business holds from the balance endpoint.
 */
export const SUPPORTED_CURRENCIES: Currency[] = [
  "USD",
  "NGN",
  "GHS",
  "KES",
  "UGX",
  "XOF",
  "EGP",
  "PKR",
  "CAD",
  "GBP",
  "EUR",
];

/**
 * @deprecated A small subset of the countries the API supports. Do not use
 * it to decide whether a country is valid.
 */
export const SUPPORTED_COUNTRIES: Country[] = [
  "US",
  "CA",
  "GB",
  "NG",
  "GH",
  "KE",
  "UG",
  "CM",
  "CI",
  "EG",
  "ET",
  "PK",
  "FR",
  "DE",
  "IT",
  "ES",
  "IE",
  "NL",
  "RO",
  "BE",
];

/**
 * @deprecated Answers `false` for most currencies the API supports, such as
 * `ZAR` and `INR`. Let the API validate the currency.
 */
export function isValidCurrency(currency: string): currency is Currency {
  return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

/**
 * @deprecated Answers `false` for most countries the API supports. Let the
 * API validate the country.
 */
export function isValidCountry(country: string): country is Country {
  return SUPPORTED_COUNTRIES.includes(country as Country);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic validation - can be enhanced based on requirements
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

export function isValidAmount(amount: number): boolean {
  return typeof amount === "number" && amount > 0 && isFinite(amount);
}

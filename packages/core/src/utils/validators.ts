import { Currency, Country } from '../types/common';

export const SUPPORTED_CURRENCIES: Currency[] = [
    'USD', 'NGN', 'GHS', 'KES', 'UGX', 'XOF', 'EGP', 'PKR', 'CAD', 'GBP', 'EUR',
];

export const SUPPORTED_COUNTRIES: Country[] = [
    'US', 'CA', 'GB', 'NG', 'GH', 'KE', 'UG', 'CM', 'CI', 'EG', 'ET', 'PK',
    'FR', 'DE', 'IT', 'ES', 'IE', 'NL', 'RO', 'BE',
];

export function isValidCurrency(currency: string): currency is Currency {
    return SUPPORTED_CURRENCIES.includes(currency as Currency);
}

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
    return typeof amount === 'number' && amount > 0 && isFinite(amount);
}

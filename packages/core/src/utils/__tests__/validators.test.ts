import {
    isValidCurrency,
    isValidCountry,
    isValidEmail,
    isValidPhoneNumber,
    isValidAmount,
} from '../validators';

describe('Validators', () => {
    describe('isValidCurrency', () => {
        it('should return true for valid currencies', () => {
            expect(isValidCurrency('USD')).toBe(true);
            expect(isValidCurrency('NGN')).toBe(true);
            expect(isValidCurrency('GHS')).toBe(true);
        });

        it('should return false for invalid currencies', () => {
            expect(isValidCurrency('XXX')).toBe(false);
            expect(isValidCurrency('')).toBe(false);
            expect(isValidCurrency('US')).toBe(false);
        });
    });

    describe('isValidCountry', () => {
        it('should return true for valid countries', () => {
            expect(isValidCountry('US')).toBe(true);
            expect(isValidCountry('NG')).toBe(true);
            expect(isValidCountry('GH')).toBe(true);
        });

        it('should return false for invalid countries', () => {
            expect(isValidCountry('XX')).toBe(false);
            expect(isValidCountry('')).toBe(false);
            expect(isValidCountry('USA')).toBe(false);
        });
    });

    describe('isValidEmail', () => {
        it('should return true for valid emails', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(isValidEmail('plainaddress')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
        });
    });

    describe('isValidPhoneNumber', () => {
        it('should return true for valid phone numbers', () => {
            expect(isValidPhoneNumber('+1234567890')).toBe(true);
            expect(isValidPhoneNumber('+2348012345678')).toBe(true);
        });

        it('should return false for invalid phone numbers', () => {
            // Assuming specific format requirements, but basics:
            expect(isValidPhoneNumber('1234567890')).toBe(false); // Missing +
            expect(isValidPhoneNumber('')).toBe(false);
        });
    });

    describe('isValidAmount', () => {
        it('should return true for positive numbers', () => {
            expect(isValidAmount(100)).toBe(true);
            expect(isValidAmount(0.01)).toBe(true);
        });

        it('should return false for non-positive numbers', () => {
            expect(isValidAmount(0)).toBe(false);
            expect(isValidAmount(-10)).toBe(false);
        });
    });
});

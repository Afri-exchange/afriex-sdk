import { RateService } from '../RateService';
import { HttpClient } from '@afriex/core';
import { ValidationError } from '@afriex/core';

const mockHttpClient = {
    get: jest.fn(),
} as unknown as HttpClient;

describe('RateService', () => {
    let rateService: RateService;

    beforeEach(() => {
        jest.clearAllMocks();
        rateService = new RateService(mockHttpClient);
    });

    describe('getRates', () => {
        it('should get rates with string params', async () => {
            const mockResponse = {
                rates: { USD: { NGN: '1550.00', GBP: '0.79' } },
                base: ['USD'],
                updatedAt: 1707249600
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await rateService.getRates({
                base: 'USD',
                symbols: 'NGN,GBP'
            });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/public/rates', {
                params: { base: 'USD', symbols: 'NGN,GBP' }
            });
            expect(result).toEqual(mockResponse);
        });

        it('should get rates with array params', async () => {
            const mockResponse = {
                rates: { USD: { NGN: '1550' }, NGN: { USD: '0.00065' } },
                base: ['USD', 'NGN'],
                updatedAt: 1707249600
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await rateService.getRates({
                base: ['USD', 'NGN'],
                symbols: ['NGN', 'USD']
            });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/v2/public/rates', {
                params: { base: 'USD,NGN', symbols: 'NGN,USD' }
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw ValidationError when base is missing', async () => {
            await expect(rateService.getRates({
                base: '',
                symbols: 'NGN'
            })).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError when symbols is missing', async () => {
            await expect(rateService.getRates({
                base: 'USD',
                symbols: ''
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('getRate', () => {
        it('should get rate between two currencies', async () => {
            const mockResponse = {
                rates: { USD: { NGN: '1550.00' } },
                base: ['USD'],
                updatedAt: 1707249600
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await rateService.getRate('USD', 'NGN');

            expect(result).toBe('1550.00');
        });

        it('should return "0" when rate not found', async () => {
            const mockResponse = {
                rates: {},
                base: [],
                updatedAt: 1707249600
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await rateService.getRate('XYZ', 'ABC');

            expect(result).toBe('0');
        });

        it('should throw ValidationError when currencies are missing', async () => {
            await expect(rateService.getRate('', 'NGN')).rejects.toThrow(ValidationError);
            await expect(rateService.getRate('USD', '')).rejects.toThrow(ValidationError);
        });
    });

    describe('convert', () => {
        it('should convert amount between currencies', async () => {
            const mockResponse = {
                rates: { USD: { NGN: '1550.00' } },
                base: ['USD'],
                updatedAt: 1707249600
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await rateService.convert(100, 'USD', 'NGN');

            expect(result).toBe(155000);
        });

        it('should throw ValidationError when amount is 0 or negative', async () => {
            await expect(rateService.convert(0, 'USD', 'NGN')).rejects.toThrow(ValidationError);
            await expect(rateService.convert(-100, 'USD', 'NGN')).rejects.toThrow(ValidationError);
        });
    });
});

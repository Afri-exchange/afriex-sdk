import { PaymentMethodService } from '../PaymentMethodService';
import { HttpClient } from '@afriex/core';
import { ValidationError } from '@afriex/core';

const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
} as unknown as HttpClient;

describe('PaymentMethodService', () => {
    let paymentMethodService: PaymentMethodService;

    beforeEach(() => {
        jest.clearAllMocks();
        paymentMethodService = new PaymentMethodService(mockHttpClient);
    });

    describe('create', () => {
        it('should create a payment method successfully', async () => {
            const mockPaymentMethod = {
                paymentMethodId: 'pm-123',
                channel: 'BANK_ACCOUNT',
                customerId: 'cust-123',
                accountName: 'John Doe',
                accountNumber: '1234567890'
            };

            (mockHttpClient.post as jest.Mock).mockResolvedValue({ data: mockPaymentMethod });

            const result = await paymentMethodService.create({
                channel: 'BANK_ACCOUNT',
                customerId: 'cust-123',
                accountName: 'John Doe',
                accountNumber: '1234567890',
                countryCode: 'NG',
                institution: { institutionCode: '044' }
            });

            expect(mockHttpClient.post).toHaveBeenCalledWith('/api/v1/payment-method', expect.any(Object));
            expect(result).toEqual(mockPaymentMethod);
        });

        it('should throw ValidationError when channel is missing', async () => {
            await expect(paymentMethodService.create({
                channel: '' as any,
                customerId: 'cust-123',
                accountName: 'John',
                accountNumber: '123',
                countryCode: 'NG',
                institution: {}
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('get', () => {
        it('should get a payment method by ID', async () => {
            const mockPaymentMethod = { paymentMethodId: 'pm-123' };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockPaymentMethod });

            const result = await paymentMethodService.get('pm-123');

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method/pm-123');
            expect(result).toEqual(mockPaymentMethod);
        });

        it('should throw ValidationError when ID is missing', async () => {
            await expect(paymentMethodService.get('')).rejects.toThrow(ValidationError);
        });
    });

    describe('list', () => {
        it('should list payment methods', async () => {
            const mockResponse = {
                data: [{ paymentMethodId: 'pm-1' }],
                page: 1,
                total: 1
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await paymentMethodService.list({ page: 1, limit: 10 });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method', {
                params: { page: 1, limit: 10 }
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('delete', () => {
        it('should delete a payment method', async () => {
            (mockHttpClient.delete as jest.Mock).mockResolvedValue(undefined);

            await paymentMethodService.delete('pm-123');

            expect(mockHttpClient.delete).toHaveBeenCalledWith('/api/v1/payment-method/pm-123');
        });
    });

    describe('getInstitutions', () => {
        it('should get institutions for a country', async () => {
            const mockInstitutions = [
                { institutionId: 'bank-1', institutionName: 'Access Bank', institutionCode: '044' }
            ];

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockInstitutions);

            const result = await paymentMethodService.getInstitutions({
                channel: 'BANK_ACCOUNT',
                countryCode: 'NG'
            });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method/institution', {
                params: { channel: 'BANK_ACCOUNT', countryCode: 'NG' }
            });
            expect(result).toEqual(mockInstitutions);
        });

        it('should throw ValidationError when params are missing', async () => {
            await expect(paymentMethodService.getInstitutions({
                channel: '' as any,
                countryCode: 'NG'
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('resolveAccount', () => {
        it('should resolve account details', async () => {
            const mockResponse = { recipientName: 'John Doe' };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await paymentMethodService.resolveAccount({
                channel: 'BANK_ACCOUNT',
                accountNumber: '1234567890',
                institutionCode: '044',
                countryCode: 'NG'
            });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method/resolve', {
                params: {
                    channel: 'BANK_ACCOUNT',
                    accountNumber: '1234567890',
                    institutionCode: '044',
                    countryCode: 'NG'
                }
            });
            expect(result).toEqual(mockResponse);
        });

        it('should throw ValidationError when institutionCode is missing for bank account', async () => {
            await expect(paymentMethodService.resolveAccount({
                channel: 'BANK_ACCOUNT',
                accountNumber: '1234567890',
                countryCode: 'NG'
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('getCryptoWallet', () => {
        it('should get crypto wallet', async () => {
            const mockResponse = {
                data: [{ address: '0x123', network: 'ethereum' }],
                total: 1,
                page: 1
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await paymentMethodService.getCryptoWallet({ asset: 'USDT' });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method/crypto-wallet', {
                params: { asset: 'USDT' }
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getVirtualAccount', () => {
        it('should get virtual account', async () => {
            const mockPaymentMethod = {
                paymentMethodId: 'pm-va-123',
                accountNumber: '999888777'
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockPaymentMethod });

            const result = await paymentMethodService.getVirtualAccount({ currency: 'USD' });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/payment-method/virtual-account', {
                params: { currency: 'USD' }
            });
            expect(result).toEqual(mockPaymentMethod);
        });
    });
});

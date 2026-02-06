import { TransactionService } from '../TransactionService';
import { HttpClient } from '@afriex/core';
import { ValidationError } from '@afriex/core';

const mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
} as unknown as HttpClient;

describe('TransactionService', () => {
    let transactionService: TransactionService;

    beforeEach(() => {
        jest.clearAllMocks();
        transactionService = new TransactionService(mockHttpClient);
    });

    describe('create', () => {
        it('should create a transaction successfully', async () => {
            const mockTransaction = {
                transactionId: 'txn-123',
                customerId: 'cust-123',
                status: 'PENDING',
                sourceAmount: '100',
                sourceCurrency: 'USD',
                destinationAmount: '155000',
                destinationCurrency: 'NGN'
            };

            (mockHttpClient.post as jest.Mock).mockResolvedValue({ data: mockTransaction });

            const result = await transactionService.create({
                customerId: 'cust-123',
                destinationAmount: 155000,
                destinationCurrency: 'NGN',
                sourceCurrency: 'USD',
                destinationId: 'pm-123'
            });

            expect(mockHttpClient.post).toHaveBeenCalledWith('/api/v1/transaction', {
                customerId: 'cust-123',
                destinationAmount: 155000,
                destinationCurrency: 'NGN',
                sourceCurrency: 'USD',
                destinationId: 'pm-123'
            });
            expect(result).toEqual(mockTransaction);
        });

        it('should throw ValidationError when customerId is missing', async () => {
            await expect(transactionService.create({
                customerId: '',
                destinationAmount: 1000,
                destinationCurrency: 'NGN',
                sourceCurrency: 'USD',
                destinationId: 'pm-123'
            })).rejects.toThrow(ValidationError);
        });

        it('should throw ValidationError when destinationAmount is missing', async () => {
            await expect(transactionService.create({
                customerId: 'cust-123',
                destinationAmount: 0,
                destinationCurrency: 'NGN',
                sourceCurrency: 'USD',
                destinationId: 'pm-123'
            })).rejects.toThrow(ValidationError);
        });
    });

    describe('get', () => {
        it('should get a transaction by ID', async () => {
            const mockTransaction = {
                transactionId: 'txn-123',
                status: 'COMPLETED'
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue({ data: mockTransaction });

            const result = await transactionService.get('txn-123');

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/transaction/txn-123');
            expect(result).toEqual(mockTransaction);
        });

        it('should throw ValidationError when ID is missing', async () => {
            await expect(transactionService.get('')).rejects.toThrow(ValidationError);
        });
    });

    describe('list', () => {
        it('should list transactions with pagination', async () => {
            const mockResponse = {
                data: [
                    { transactionId: 'txn-1', status: 'COMPLETED' },
                    { transactionId: 'txn-2', status: 'PENDING' }
                ],
                page: 1,
                total: 2
            };

            (mockHttpClient.get as jest.Mock).mockResolvedValue(mockResponse);

            const result = await transactionService.list({ page: 1, limit: 20 });

            expect(mockHttpClient.get).toHaveBeenCalledWith('/api/v1/transaction', {
                params: { page: 1, limit: 20 }
            });
            expect(result).toEqual(mockResponse);
        });
    });
});

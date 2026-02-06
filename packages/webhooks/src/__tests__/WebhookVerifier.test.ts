import * as crypto from 'crypto';
import { WebhookVerifier } from '../WebhookVerifier';

describe('WebhookVerifier', () => {
    // Generate a test key pair
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    describe('constructor', () => {
        it('should create verifier with public key', () => {
            const verifier = new WebhookVerifier(publicKey);
            expect(verifier).toBeInstanceOf(WebhookVerifier);
        });

        it('should throw error when public key is empty', () => {
            expect(() => new WebhookVerifier('')).toThrow('Public key is required');
        });
    });

    describe('verify', () => {
        it('should return true for valid signature', () => {
            const verifier = new WebhookVerifier(publicKey);
            const payload = JSON.stringify({ event: 'test', data: {} });

            // Create valid signature
            const signer = crypto.createSign('SHA256');
            signer.update(payload);
            const signature = signer.sign(privateKey, 'base64');

            const result = verifier.verify(payload, signature);

            expect(result).toBe(true);
        });

        it('should return false for invalid signature', () => {
            const verifier = new WebhookVerifier(publicKey);
            const payload = JSON.stringify({ event: 'test', data: {} });
            const invalidSignature = 'invalid-signature';

            const result = verifier.verify(payload, invalidSignature);

            expect(result).toBe(false);
        });

        it('should return false for empty payload', () => {
            const verifier = new WebhookVerifier(publicKey);

            const result = verifier.verify('', 'some-signature');

            expect(result).toBe(false);
        });

        it('should return false for empty signature', () => {
            const verifier = new WebhookVerifier(publicKey);
            const payload = JSON.stringify({ event: 'test' });

            const result = verifier.verify(payload, '');

            expect(result).toBe(false);
        });
    });

    describe('verifyAndParse', () => {
        it('should verify and parse valid webhook payload', () => {
            const verifier = new WebhookVerifier(publicKey);
            const webhookPayload = {
                event: 'customer.created',
                data: { customerId: 'cust-123', name: 'John Doe' }
            };
            const payload = JSON.stringify(webhookPayload);

            // Create valid signature
            const signer = crypto.createSign('SHA256');
            signer.update(payload);
            const signature = signer.sign(privateKey, 'base64');

            const result = verifier.verifyAndParse(payload, signature);

            expect(result).toEqual(webhookPayload);
        });

        it('should throw error for invalid signature', () => {
            const verifier = new WebhookVerifier(publicKey);
            const payload = JSON.stringify({ event: 'test' });

            expect(() => verifier.verifyAndParse(payload, 'invalid')).toThrow('Invalid webhook signature');
        });
    });
});

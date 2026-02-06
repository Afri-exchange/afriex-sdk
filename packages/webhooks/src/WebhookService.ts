import { HttpClient, ValidationError } from '@afriex/core';
import { WebhookVerifier } from './WebhookVerifier';
import { WebhookPayload, WebhookEndpoint, CreateWebhookRequest } from './types';

export class WebhookService {
    private httpClient: HttpClient;
    private verifier?: WebhookVerifier;

    constructor(httpClient: HttpClient, webhookSecret?: string) {
        this.httpClient = httpClient;

        if (webhookSecret) {
            this.verifier = new WebhookVerifier(webhookSecret);
        }
    }

    /**
     * Create a webhook endpoint
     */
    async create(request: CreateWebhookRequest): Promise<WebhookEndpoint> {
        if (!request.url) {
            throw new ValidationError('Webhook URL is required');
        }

        if (!request.events || request.events.length === 0) {
            throw new ValidationError('At least one event type is required');
        }

        return this.httpClient.post<WebhookEndpoint>('/v1/webhooks', request);
    }

    /**
     * Get a webhook endpoint
     */
    async get(webhookId: string): Promise<WebhookEndpoint> {
        if (!webhookId) {
            throw new ValidationError('Webhook ID is required');
        }

        return this.httpClient.get<WebhookEndpoint>(`/v1/webhooks/${webhookId}`);
    }

    /**
     * List all webhook endpoints
     */
    async list(): Promise<WebhookEndpoint[]> {
        const response = await this.httpClient.get<{ data: WebhookEndpoint[] }>(
            '/v1/webhooks'
        );
        return response.data;
    }

    /**
     * Delete a webhook endpoint
     */
    async delete(webhookId: string): Promise<void> {
        if (!webhookId) {
            throw new ValidationError('Webhook ID is required');
        }

        await this.httpClient.delete(`/v1/webhooks/${webhookId}`);
    }

    /**
     * Verify webhook signature
     */
    verifySignature(
        rawPayload: string,
        signature: string,
        timestamp: string
    ): boolean {
        if (!this.verifier) {
            throw new Error('Webhook secret not configured');
        }

        return this.verifier.verify(rawPayload, signature, timestamp);
    }

    /**
     * Verify and parse webhook payload
     */
    verifyAndParse(
        rawPayload: string,
        signature: string,
        timestamp: string
    ): WebhookPayload {
        if (!this.verifier) {
            throw new Error('Webhook secret not configured');
        }

        return this.verifier.verifyAndParse(rawPayload, signature, timestamp);
    }
}

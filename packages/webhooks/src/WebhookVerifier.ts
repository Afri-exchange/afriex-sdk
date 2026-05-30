import { WebhookService } from "./WebhookService.js";

/**
 * Backward-compatible wrapper around WebhookService verification methods.
 */
export class WebhookVerifier extends WebhookService {
  /**
   * Create a webhook verifier
   * @param publicKey - Afriex's public key for signature verification
   */
  constructor(publicKey: string) {
    if (!publicKey) {
      throw new Error("Public key is required for webhook verification");
    }
    super(undefined, publicKey);
  }
}

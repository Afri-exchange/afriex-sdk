import * as crypto from "crypto";
import { WebhookPayload } from "./types.js";

export class WebhookVerifier {
  private publicKey: string;

  /**
   * Create a webhook verifier
   * @param publicKey - Afriex's public key for signature verification
   */
  constructor(publicKey: string) {
    if (!publicKey) {
      throw new Error("Public key is required for webhook verification");
    }
    this.publicKey = publicKey;
  }

  /**
   * Verify webhook signature using Afriex's public key
   * @param payload - Raw webhook payload string
   * @param signature - Value of x-webhook-signature header
   * @returns true if signature is valid
   */
  verify(payload: string, signature: string): boolean {
    if (!payload || !signature) {
      return false;
    }

    try {
      const verifier = crypto.createVerify("SHA256");
      verifier.update(payload);
      return verifier.verify(this.publicKey, signature, "base64");
    } catch {
      return false;
    }
  }

  /**
   * Verify and parse webhook payload
   * @param payload - Raw webhook payload string
   * @param signature - Value of x-webhook-signature header
   * @returns Parsed webhook payload
   * @throws Error if signature is invalid
   */
  verifyAndParse(payload: string, signature: string): WebhookPayload {
    if (!this.verify(payload, signature)) {
      throw new Error("Invalid webhook signature");
    }

    return JSON.parse(payload) as WebhookPayload;
  }
}

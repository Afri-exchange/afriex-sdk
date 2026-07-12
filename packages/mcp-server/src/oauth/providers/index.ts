import type { McpServerConfig } from "../../config.js";
import type { OAuthProvider } from "../types.js";
import { createCustomProvider } from "./custom.js";
import { createWorkosProvider } from "./workos.js";
import { createAuth0Provider } from "./auth0.js";

export function createOAuthProvider(config: McpServerConfig): OAuthProvider {
  const name = config.oauth?.provider ?? "custom";
  switch (name) {
    case "custom":
      return createCustomProvider();
    case "workos":
      return createWorkosProvider();
    case "auth0":
      return createAuth0Provider();
    default:
      throw new Error(`Unknown OAUTH_PROVIDER: ${name}. Expected "custom", "workos", or "auth0".`);
  }
}

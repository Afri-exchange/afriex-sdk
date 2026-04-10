import { Config, AfriexConfig } from "../config/Config.js";
import { HttpClient } from "./HttpClient.js";

export class AfriexClient {
  private config: Config;
  private httpClient: HttpClient;

  constructor(config: AfriexConfig) {
    this.config = new Config(config);
    this.httpClient = new HttpClient(this.config);
  }

  /**
   * Get the HTTP client for custom requests
   */
  getHttpClient(): HttpClient {
    return this.httpClient;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Config {
    return this.config;
  }
}

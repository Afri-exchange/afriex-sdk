import {
  AfriexError,
  HttpClient,
  NetworkError,
  ValidationBuilder,
} from "@afriex/core";
import {
  CreateUploadUrlRequest,
  UploadFileRequest,
  UploadUrl,
  UploadableFile,
  UploadedFile,
} from "./types.js";

export class MediaService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Generate a presigned URL for a file upload
   * POST /media/url
   *
   * PUT the file to `url` within `expiresIn` seconds, then attach `key` to the
   * request that needs the file. `upload()` does both steps.
   */
  async createUploadUrl(request: CreateUploadUrlRequest): Promise<UploadUrl> {
    this.validateUploadUrlRequest(request).throwIfInvalid();

    const response = await this.httpClient.post<{ data: UploadUrl }>(
      "/media/url",
      { fileName: request.fileName, type: request.type }
    );
    return response.data;
  }

  /**
   * Request an upload URL and upload the file to it.
   *
   * @returns The `key` to attach to a later request, such as `meta.invoice`
   *   on a SWIFT withdrawal or `fileKey` on a pool-account payment proof.
   */
  async upload(request: UploadFileRequest): Promise<UploadedFile> {
    this.validateUploadUrlRequest(request)
      .condition(
        "file",
        !this.isUploadable(request?.file),
        "file must be a Blob, an ArrayBuffer or a Uint8Array"
      )
      .throwIfInvalid();

    const { url, key } = await this.createUploadUrl({
      fileName: request.fileName,
      type: request.type,
    });

    let response: Response;
    try {
      // The presigned URL carries its own authorization. This request goes to
      // the storage host, so it must not carry the API key.
      response = await fetch(url, {
        method: "PUT",
        body: request.file,
        headers: request.contentType
          ? { "Content-Type": request.contentType }
          : undefined,
      });
    } catch (error) {
      throw new NetworkError(
        "The file could not be uploaded",
        error instanceof Error ? error : undefined
      );
    }

    if (!response.ok) {
      throw new AfriexError(
        `The file upload was rejected with status ${response.status}`
      );
    }

    return { key };
  }

  private validateUploadUrlRequest(
    request: CreateUploadUrlRequest
  ): ValidationBuilder {
    return new ValidationBuilder()
      .required("fileName", request?.fileName)
      .condition(
        "type",
        request?.type !== undefined &&
          request.type !== "transaction" &&
          request.type !== "user",
        "type must be 'transaction' or 'user'"
      );
  }

  private isUploadable(file: unknown): file is UploadableFile {
    return (
      file instanceof Blob ||
      file instanceof ArrayBuffer ||
      file instanceof Uint8Array
    );
  }
}

/**
 * What the file is for: `transaction` for transaction files (a SWIFT invoice,
 * a pool-account payment proof), `user` for identity documents. The two are
 * stored apart, so a key from one is not found by an endpoint expecting the
 * other.
 */
export type MediaUploadType = "transaction" | "user";

/** Request body for POST /media/url. */
export interface CreateUploadUrlRequest {
  /** The name of the file to upload. */
  fileName: string;
  /** Defaults to `user` when omitted. */
  type?: MediaUploadType;
}

/** A presigned upload URL, as returned by POST /media/url. */
export interface UploadUrl {
  /** The presigned URL to PUT the file to. */
  url: string;
  /**
   * A stable reference to the uploaded object. Later requests take this key,
   * never the presigned URL.
   */
  key: string;
  /** How many seconds the URL stays valid for the upload. */
  expiresIn: number;
}

/** The file contents `upload()` accepts. */
export type UploadableFile = Blob | ArrayBuffer | Uint8Array;

export interface UploadFileRequest extends CreateUploadUrlRequest {
  /** The file contents. A Node.js `Buffer` is a `Uint8Array`. */
  file: UploadableFile;
  /**
   * Sent as the `Content-Type` of the upload. When omitted, a `Blob` is sent
   * with its own type and other bodies with none.
   */
  contentType?: string;
}

/** The result of `upload()`. */
export interface UploadedFile {
  /** The key to attach to a later request. */
  key: string;
}

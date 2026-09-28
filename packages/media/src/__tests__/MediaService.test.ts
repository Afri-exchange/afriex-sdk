import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import { MediaService } from "../MediaService.js";
import {
  AfriexError,
  HttpClient,
  NetworkError,
  ValidationError,
} from "@afriex/core";

const mockHttpClient = {
  post: vi.fn(),
} as unknown as HttpClient;

const uploadUrl = {
  url: "https://storage.example.com/upload?signature=abc",
  key: "business-id/invoice.pdf",
  expiresIn: 300,
};

describe("MediaService", () => {
  let mediaService: MediaService;
  let fetchMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    mediaService = new MediaService(mockHttpClient);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("createUploadUrl", () => {
    it("should request an upload URL", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });

      const result = await mediaService.createUploadUrl({
        fileName: "invoice.pdf",
        type: "transaction",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/media/url", {
        fileName: "invoice.pdf",
        type: "transaction",
      });
      expect(result).toEqual(uploadUrl);
    });

    it("should allow the type to be omitted", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });

      await mediaService.createUploadUrl({ fileName: "passport.png" });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/media/url", {
        fileName: "passport.png",
        type: undefined,
      });
    });

    it("should throw ValidationError when fileName is missing", async () => {
      await expect(
        mediaService.createUploadUrl({ fileName: "" })
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
    });

    it("should throw ValidationError for a type the API does not know", async () => {
      await expect(
        mediaService.createUploadUrl({
          fileName: "invoice.pdf",
          type: "invoice" as "transaction",
        })
      ).rejects.toMatchObject({
        fields: [
          { field: "type", message: "type must be 'transaction' or 'user'" },
        ],
      });
    });
  });

  describe("upload", () => {
    it("should upload the file to the presigned URL and return the key", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });
      const file = new Uint8Array([37, 80, 68, 70]);

      const result = await mediaService.upload({
        fileName: "invoice.pdf",
        type: "transaction",
        file,
        contentType: "application/pdf",
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith("/media/url", {
        fileName: "invoice.pdf",
        type: "transaction",
      });
      expect(fetchMock).toHaveBeenCalledWith(uploadUrl.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/pdf" },
      });
      expect(result).toEqual({ key: uploadUrl.key });
    });

    it("should never send the API key to the storage host", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });

      await mediaService.upload({
        fileName: "invoice.pdf",
        file: new Blob(["%PDF"], { type: "application/pdf" }),
      });

      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers).toBeUndefined();
    });

    it("should accept an ArrayBuffer", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });

      await expect(
        mediaService.upload({
          fileName: "invoice.pdf",
          file: new ArrayBuffer(4),
        })
      ).resolves.toEqual({ key: uploadUrl.key });
    });

    it("should throw ValidationError before any request when the file is not uploadable", async () => {
      await expect(
        mediaService.upload({
          fileName: "invoice.pdf",
          file: "./invoice.pdf" as unknown as Uint8Array,
        })
      ).rejects.toThrow(ValidationError);
      expect(mockHttpClient.post).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should throw AfriexError when the storage host rejects the upload", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });
      fetchMock.mockResolvedValue({ ok: false, status: 403 });

      const upload = mediaService.upload({
        fileName: "invoice.pdf",
        file: new Uint8Array([1]),
      });

      await expect(upload).rejects.toThrow(AfriexError);
      await expect(upload).rejects.toThrow(
        "The file upload was rejected with status 403"
      );
    });

    it("should throw NetworkError when the upload cannot be sent", async () => {
      (mockHttpClient.post as Mock).mockResolvedValue({ data: uploadUrl });
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));

      await expect(
        mediaService.upload({
          fileName: "invoice.pdf",
          file: new Uint8Array([1]),
        })
      ).rejects.toThrow(NetworkError);
    });
  });
});

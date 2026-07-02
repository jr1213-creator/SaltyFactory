export type StorageResult = { ok: true; url?: string; path?: string; metadata?: Record<string, unknown> } | { ok: false; error: string; setupRequired?: string[] };

export type StorageStatus = {
  ok: boolean;
  status: "connected" | "configured_not_verified" | "setup_needed" | "disabled" | "failed";
  setupRequired: string[];
  buckets: Array<{ name: string; purpose: "private_generated_assets" | "public_approved_assets"; required: boolean }>;
  message: string;
};

export interface StorageProvider {
  uploadPrivateAsset(path: string, data: Blob | Buffer | Uint8Array, contentType: string): Promise<StorageResult>;
  createSignedPrivateUrl(path: string, expiresInSeconds?: number): Promise<StorageResult>;
  moveApprovedAssetToPublic(privatePath: string, publicPath: string): Promise<StorageResult>;
  createPublicApprovedUrl(path: string, approved: boolean): StorageResult;
  deletePrivateTemporaryAsset(path: string): Promise<StorageResult>;
  checkStatus?(): Promise<StorageStatus>;
}

export class StorageProviderDisabled implements StorageProvider {
  async uploadPrivateAsset(_path?: string, _data?: Blob | Buffer | Uint8Array, _contentType?: string): Promise<StorageResult> { return { ok: false, error: "storage_provider_disabled", setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }; }
  async createSignedPrivateUrl(_path?: string, _expiresInSeconds?: number): Promise<StorageResult> { return { ok: false, error: "storage_provider_disabled", setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }; }
  async moveApprovedAssetToPublic(_privatePath?: string, _publicPath?: string): Promise<StorageResult> { return { ok: false, error: "storage_provider_disabled", setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }; }
  createPublicApprovedUrl(_path?: string, _approved?: boolean): StorageResult { return { ok: false, error: "storage_provider_disabled", setupRequired: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] }; }
  async deletePrivateTemporaryAsset(_path?: string): Promise<StorageResult> { return { ok: false, error: "storage_provider_disabled" }; }
  async checkStatus(): Promise<StorageStatus> {
    return storageStatusFromConfig({});
  }
}

export class SupabaseStorageProvider extends StorageProviderDisabled {
  constructor(
    public url: string,
    private serviceRoleKey: string,
    public privateBucket: string,
    public publicBucket: string,
    private fetcher: typeof fetch = fetch
  ) {
    super();
    if (!url || !serviceRoleKey) throw new Error("Supabase storage requires server-side service role config");
  }

  private endpoint(path: string) {
    return `${this.url.replace(/\/$/, "")}/storage/v1/${path.replace(/^\//, "")}`;
  }

  private headers(contentType?: string) {
    return {
      authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      ...(contentType ? { "content-type": contentType } : {})
    };
  }

  async checkStatus(): Promise<StorageStatus> {
    const buckets = requiredStorageBuckets(this.privateBucket, this.publicBucket);
    try {
      const response = await this.fetcher(this.endpoint("bucket"), { method: "GET", headers: this.headers() });
      if (!response.ok) return { ok: false, status: "failed", setupRequired: ["Verify Supabase Storage service role access."], buckets, message: `Supabase Storage returned ${response.status}.` };
      const body = await response.json().catch(() => []);
      const names = new Set((Array.isArray(body) ? body : []).map((bucket: any) => String(bucket.name ?? bucket.id ?? "")));
      const missing = buckets.filter((bucket) => !names.has(bucket.name)).map((bucket) => bucket.name);
      return missing.length
        ? { ok: false, status: "setup_needed", setupRequired: missing.map((name) => `Create bucket ${name}.`), buckets, message: "Required storage buckets are missing." }
        : { ok: true, status: "connected", setupRequired: [], buckets, message: "Supabase Storage buckets verified." };
    } catch {
      return { ok: false, status: "configured_not_verified", setupRequired: ["Run storage test from Studio."], buckets, message: "Supabase Storage could not be verified from this runtime." };
    }
  }

  async uploadPrivateAsset(path = "", data?: Blob | Buffer | Uint8Array, contentType = "application/octet-stream"): Promise<StorageResult> {
    if (!path || !data) return { ok: false, error: "private_asset_path_and_data_required" };
    const response = await this.fetcher(this.endpoint(`object/${this.privateBucket}/${path}`), { method: "POST", headers: this.headers(contentType), body: data as BodyInit });
    if (!response.ok) return { ok: false, error: `storage_upload_failed_${response.status}` };
    return { ok: true, path, metadata: { bucket: this.privateBucket, visibility: "private" } };
  }

  async createSignedPrivateUrl(path = "", expiresInSeconds = 3600): Promise<StorageResult> {
    if (!path) return { ok: false, error: "private_asset_path_required" };
    const response = await this.fetcher(this.endpoint(`object/sign/${this.privateBucket}/${path}`), {
      method: "POST",
      headers: this.headers("application/json"),
      body: JSON.stringify({ expiresIn: expiresInSeconds })
    });
    if (!response.ok) return { ok: false, error: `signed_url_failed_${response.status}` };
    const body = await response.json().catch(() => ({}));
    const signedURL = String(body.signedURL ?? body.signedUrl ?? "");
    return signedURL ? { ok: true, url: `${this.url.replace(/\/$/, "")}${signedURL}`.replace(this.serviceRoleKey, "[redacted]") } : { ok: false, error: "signed_url_missing" };
  }

  async moveApprovedAssetToPublic(privatePath = "", publicPath = ""): Promise<StorageResult> {
    if (!privatePath || !publicPath) return { ok: false, error: "private_and_public_paths_required" };
    const signed = await this.createSignedPrivateUrl(privatePath, 60);
    if (!signed.ok || !signed.url) return signed;
    const source = await this.fetcher(signed.url);
    if (!source.ok) return { ok: false, error: `private_asset_read_failed_${source.status}` };
    const bytes = new Uint8Array(await source.arrayBuffer());
    const upload = await this.fetcher(this.endpoint(`object/${this.publicBucket}/${publicPath}`), { method: "POST", headers: this.headers(source.headers.get("content-type") ?? "application/octet-stream"), body: bytes });
    if (!upload.ok) return { ok: false, error: `public_asset_upload_failed_${upload.status}` };
    return { ok: true, path: publicPath, metadata: { source: privatePath, bucket: this.publicBucket, visibility: "public_approved" } };
  }

  createPublicApprovedUrl(path = "", approved = false): StorageResult {
    return approved ? { ok: true, url: `${this.url.replace(/\/$/, "")}/storage/v1/object/public/${this.publicBucket}/${path}` } : { ok: false, error: "asset_not_approved_for_public_url" };
  }
}

export class LocalDevStorageProvider extends StorageProviderDisabled {
  constructor(private baseUrl = "http://localhost:3000/dev-assets") {
    super();
    if (process.env.APP_ENV === "production") throw new Error("LocalDevStorageProvider is forbidden in production");
  }
  async uploadPrivateAsset(path = ""): Promise<StorageResult> { return path ? { ok: true, path, metadata: { visibility: "private_dev" } } : { ok: false, error: "private_asset_path_required" }; }
  async createSignedPrivateUrl(path = ""): Promise<StorageResult> { return path ? { ok: true, url: `${this.baseUrl}/private/${encodeURIComponent(path)}?signed=dev` } : { ok: false, error: "private_asset_path_required" }; }
  async moveApprovedAssetToPublic(_: string = "", publicPath = ""): Promise<StorageResult> { return publicPath ? { ok: true, path: publicPath } : { ok: false, error: "public_asset_path_required" }; }
  createPublicApprovedUrl(path = "", approved = false): StorageResult { return approved ? { ok: true, url: `${this.baseUrl}/public/${encodeURIComponent(path)}` } : { ok: false, error: "asset_not_approved_for_public_url" }; }
  async deletePrivateTemporaryAsset(path = ""): Promise<StorageResult> { return path ? { ok: true, path } : { ok: false, error: "private_asset_path_required" }; }
  async checkStatus(): Promise<StorageStatus> { return { ok: true, status: "connected", setupRequired: [], buckets: requiredStorageBuckets("dev-private", "dev-public"), message: "Local development storage is active." }; }
}

export function requiredStorageBuckets(privateBucket = "saltyfactory-private-assets", publicBucket = "saltyfactory-public-assets") {
  return [
    { name: privateBucket, purpose: "private_generated_assets" as const, required: true },
    { name: publicBucket, purpose: "public_approved_assets" as const, required: true }
  ];
}

export function storageStatusFromConfig(config: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; SUPABASE_PRIVATE_ASSETS_BUCKET?: string; SUPABASE_PUBLIC_ASSETS_BUCKET?: string }): StorageStatus {
  const setupRequired = [
    !config.SUPABASE_URL && "SUPABASE_URL",
    !config.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY"
  ].filter(Boolean) as string[];
  return {
    ok: setupRequired.length === 0,
    status: setupRequired.length ? "setup_needed" : "configured_not_verified",
    setupRequired,
    buckets: requiredStorageBuckets(config.SUPABASE_PRIVATE_ASSETS_BUCKET, config.SUPABASE_PUBLIC_ASSETS_BUCKET),
    message: setupRequired.length ? "Supabase Storage server configuration is incomplete." : "Storage credentials are present but buckets have not been verified."
  };
}

export function createStorageProvider(config: { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string; SUPABASE_PRIVATE_ASSETS_BUCKET?: string; SUPABASE_PUBLIC_ASSETS_BUCKET?: string }, fetcher?: typeof fetch): StorageProvider {
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) return new StorageProviderDisabled();
  return new SupabaseStorageProvider(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, config.SUPABASE_PRIVATE_ASSETS_BUCKET ?? "saltyfactory-private-assets", config.SUPABASE_PUBLIC_ASSETS_BUCKET ?? "saltyfactory-public-assets", fetcher);
}

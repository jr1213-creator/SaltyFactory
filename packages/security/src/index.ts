import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type CredentialEnvelope = {
  v: 1;
  alg: "aes-256-gcm";
  provider: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string | null;
  iv: string;
  tag: string;
  ciphertext: string;
};

const KEY_BYTES = 32;

function deriveKey(secret: string) {
  if (!secret || secret.trim().length < 32) throw new Error("credential_encryption_key_required");
  return createHash("sha256").update(secret).digest().subarray(0, KEY_BYTES);
}

export function redactSecret(value: string) {
  if (!value) return "";
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}

export function sanitizeProviderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "provider_error");
  const redacted = message
    .replace(/(access_token|refresh_token|api[_-]?token|client[_-]?secret|clientSecret|authorization|password|secret)=?[^&\s]+/gi, "$1=[redacted]")
    .replace(/\b(access_token|refresh_token|api[_-]?token|client[_-]?secret|clientSecret|token|secret|password|authorization)\s+[A-Za-z0-9._~+/=-]{6,}/gi, "$1 [redacted]")
    .slice(0, 240);
  if (/failed query:/i.test(redacted)) {
    if (/\baudit_events\b/i.test(redacted)) return "Audit logging failed. Check database schema and access.";
    return "Database query failed. Check database schema and access.";
  }
  return redacted;
}

export function encryptCredential(input: {
  secret: string;
  key: string;
  provider: string;
  workspaceId: string;
  createdBy: string;
  expiresAt?: string | null;
}) {
  const iv = randomBytes(12);
  const aad = Buffer.from(`${input.provider}:${input.workspaceId}:${input.createdBy}`);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(input.key), iv);
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(input.secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const envelope: CredentialEnvelope = {
    v: 1,
    alg: "aes-256-gcm",
    provider: input.provider,
    workspaceId: input.workspaceId,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt ?? null,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
  return envelope;
}

export function decryptCredential(envelope: CredentialEnvelope, key: string) {
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(key), Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(Buffer.from(`${envelope.provider}:${envelope.workspaceId}:${envelope.createdBy}`));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function assertNoRawCredential(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (/(sk_|shpat_|ghp_|xox|eyJ|refresh_token|access_token|api[_-]?token)/i.test(text || "")) {
    throw new Error("raw_credential_exposure_blocked");
  }
}

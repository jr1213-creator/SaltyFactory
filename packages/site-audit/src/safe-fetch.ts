import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export type SafeFetchErrorCode =
  | "invalid_url"
  | "blocked_private_target"
  | "blocked_redirect_target"
  | "too_many_redirects"
  | "fetch_timeout"
  | "response_too_large"
  | "fetch_failed";

export class SafeFetchError extends Error {
  constructor(public readonly code: SafeFetchErrorCode) {
    super(code);
  }
}

export type SafeFetchResult = {
  ok: boolean;
  status: number;
  url: string;
  text: string;
};

type SafeFetchInternalResult = SafeFetchResult & { headers: Record<string, string | string[] | undefined> };

export type ResolvedAddress = { address: string; family?: number };
export type SafeResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolver?: SafeResolver;
  userAgent?: string;
  requester?: (url: URL) => Promise<SafeFetchInternalResult>;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 512_000;
const DEFAULT_MAX_REDIRECTS = 3;

const defaultResolver: SafeResolver = async (hostname) => dnsLookup(hostname, { all: true });

function parseIpv4(ip: string) {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return parts;
}

function isBlockedIpv4(ip: string) {
  const parts = parseIpv4(ip);
  if (!parts) return true;
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function normalizeIpv6(ip: string) {
  return ip.toLowerCase().replace(/^\[|\]$/g, "");
}

export function isBlockedAddress(address: string) {
  const normalized = normalizeIpv6(address);
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isBlockedIpv4(mapped[1]);
  const kind = isIP(normalized);
  if (kind === 4) return isBlockedIpv4(normalized);
  if (kind === 6) {
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }
  return true;
}

function parseSafeUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchError("invalid_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SafeFetchError("invalid_url");
  if (url.username || url.password) throw new SafeFetchError("invalid_url");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) throw new SafeFetchError("blocked_private_target");
  if (isIP(host) && isBlockedAddress(host)) throw new SafeFetchError("blocked_private_target");
  return url;
}

async function assertPublicResolvedHost(hostname: string, resolver: SafeResolver) {
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new SafeFetchError("blocked_private_target");
    return [{ address: hostname, family: isIP(hostname) }];
  }
  const records = await resolver(hostname).catch(() => {
    throw new SafeFetchError("fetch_failed");
  });
  if (!records.length || records.some((record) => isBlockedAddress(record.address))) {
    throw new SafeFetchError("blocked_private_target");
  }
  return records;
}

export async function assertPublicAuditUrl(rawUrl: string, resolver: SafeResolver = defaultResolver) {
  const url = parseSafeUrl(rawUrl);
  await assertPublicResolvedHost(url.hostname, resolver);
  return url;
}

function requestOnce(url: URL, options: {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  userAgent: string;
  resolver: SafeResolver;
  requester?: (url: URL) => Promise<SafeFetchInternalResult>;
}): Promise<SafeFetchInternalResult> {
  if (options.requester) return options.requester(url);
  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    let settled = false;
    let received = 0;
    const chunks: Buffer[] = [];
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const req = transport({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: { "user-agent": options.userAgent },
      timeout: options.timeoutMs,
      lookup: async (hostname, _lookupOptions, callback) => {
        try {
          const records = await assertPublicResolvedHost(String(hostname), options.resolver);
          const selected = records[0];
          if (!selected) throw new SafeFetchError("fetch_failed");
          callback(null, selected.address, selected.family || isIP(selected.address) || 4);
        } catch (error) {
          callback(error as Error, "", 4);
        }
      }
    }, (res) => {
      res.on("data", (chunk: Buffer) => {
        received += chunk.byteLength;
        if (received > options.maxBytes) {
          req.destroy(new SafeFetchError("response_too_large"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({
          ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
          status: res.statusCode ?? 0,
          url: url.toString(),
          text: Buffer.concat(chunks).toString("utf8"),
          headers: res.headers
        });
      });
    });
    req.on("timeout", () => req.destroy(new SafeFetchError("fetch_timeout")));
    req.on("error", fail);
    req.end();
  });
}

function redirectLocation(baseUrl: URL, location: string | string[] | undefined) {
  const value = Array.isArray(location) ? location[0] : location;
  if (!value) return null;
  try {
    return new URL(value, baseUrl);
  } catch {
    throw new SafeFetchError("invalid_url");
  }
}

export async function safeFetchText(rawUrl: string | URL, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const resolver = options.resolver ?? defaultResolver;
  let url = await assertPublicAuditUrl(String(rawUrl), resolver);
  const requestOptions: {
    timeoutMs: number;
    maxBytes: number;
    maxRedirects: number;
    userAgent: string;
    resolver: SafeResolver;
    requester?: (url: URL) => Promise<SafeFetchInternalResult>;
  } = {
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    maxRedirects: options.maxRedirects ?? DEFAULT_MAX_REDIRECTS,
    userAgent: options.userAgent ?? "SaltyFactorySiteAudit/1.0",
    resolver
  };
  if (options.requester) requestOptions.requester = options.requester;

  for (let redirects = 0; redirects <= requestOptions.maxRedirects; redirects += 1) {
    const response = await requestOnce(url, requestOptions).catch((error) => {
      if (error instanceof SafeFetchError) throw error;
      throw new SafeFetchError("fetch_failed");
    });
    const isRedirect = response.status >= 300 && response.status < 400;
    if (!isRedirect) {
      await assertPublicAuditUrl(response.url, resolver);
      return response;
    }
    const nextUrl = redirectLocation(url, response.headers.location);
    if (!nextUrl) return response;
    try {
      url = await assertPublicAuditUrl(nextUrl.toString(), resolver);
    } catch (error) {
      if (error instanceof SafeFetchError && error.code === "blocked_private_target") throw new SafeFetchError("blocked_redirect_target");
      throw error;
    }
  }

  throw new SafeFetchError("too_many_redirects");
}

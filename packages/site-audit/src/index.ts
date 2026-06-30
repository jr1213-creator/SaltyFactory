import { assertPublicAuditUrl, safeFetchText, type SafeFetchOptions, SafeFetchError } from "./safe-fetch";

export type AuditFetch = (url: string | URL, options?: SafeFetchOptions) => Promise<{ ok: boolean; status: number; url: string; text: string }>;

export type SiteAuditInput = {
  websiteUrl: string;
  sitemapUrl?: string;
  brandName?: string;
  targetKeywords?: string[];
  competitorUrls?: string[];
};

export type SiteAuditFinding = {
  severity: "info" | "low" | "medium" | "high";
  area: "seo" | "aeo" | "geo" | "structured_data" | "crawlability" | "content" | "conversion" | "security";
  message: string;
  evidence?: string;
};

export type SiteAuditResult = {
  url: string;
  auditedAt: string;
  scores: {
    overall: number;
    seo: number;
    aeo: number;
    geo: number;
    structuredData: number;
    crawlability: number;
    productSchema: number;
    contentQuality: number;
    conversionReadiness: number;
  };
  indicators: {
    robotsTxt: boolean;
    sitemapXml: boolean;
    llmsTxt: boolean;
    jsonLd: boolean;
    productSchema: boolean;
    organizationSchema: boolean;
    websiteSchema: boolean;
    faqSchema: boolean;
  };
  evidence: Record<string, unknown>;
  findings: SiteAuditFinding[];
  recommendedFixes: string[];
  priorityActions: string[];
};

const DEFAULT_TIMEOUT_MS = 8000;

function score(parts: boolean[]) {
  return Math.round((parts.filter(Boolean).length / Math.max(parts.length, 1)) * 100);
}

export { assertPublicAuditUrl, SafeFetchError };

function stripHtml(value: string) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
}

function textBetween(html: string, tag: string) {
  return [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => (match[1] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function metaContent(html: string, attr: string, value: string) {
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<meta[^>]+${attr}=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"))
    ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${escaped}["'][^>]*>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function linkHref(html: string, rel: string) {
  const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`<link[^>]+rel=["']${escaped}["'][^>]+href=["']([^"']+)["'][^>]*>`, "i"))
    ?? html.match(new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["']${escaped}["'][^>]*>`, "i"));
  return match?.[1]?.trim() ?? "";
}

function jsonLdTypes(html: string) {
  const types = new Set<string>();
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse((match[1] ?? "").trim());
      const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [])];
      for (const node of nodes) {
        const raw = node?.["@type"];
        for (const type of Array.isArray(raw) ? raw : [raw]) if (type) types.add(String(type));
      }
    } catch {
      types.add("InvalidJsonLd");
    }
  }
  return [...types];
}

async function fetchText(url: URL, fetcher: AuditFetch, timeoutMs: number) {
  const response = await fetcher(url, { timeoutMs });
  if (!response.ok) return { ok: false as const, status: response.status, text: "" };
  return { ok: true as const, status: response.status, text: response.text };
}

async function optionalExists(url: URL, path: string, fetcher: AuditFetch, timeoutMs: number) {
  const next = new URL(path, url.origin);
  await assertPublicAuditUrl(next.toString());
  const fetched = await fetchText(next, fetcher, timeoutMs).catch(() => ({ ok: false as const, status: 0, text: "" }));
  return { found: fetched.ok, url: next.toString(), text: fetched.text.slice(0, 20_000) };
}

async function optionalExactUrl(url: URL, fetcher: AuditFetch, timeoutMs: number) {
  await assertPublicAuditUrl(url.toString());
  const fetched = await fetchText(url, fetcher, timeoutMs).catch(() => ({ ok: false as const, status: 0, text: "" }));
  return { found: fetched.ok, url: url.toString(), text: fetched.text.slice(0, 20_000) };
}

export async function runSiteAudit(input: SiteAuditInput, options: { fetcher?: AuditFetch; timeoutMs?: number } = {}): Promise<SiteAuditResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? safeFetchText;
  const url = await assertPublicAuditUrl(input.websiteUrl);
  const homepage = await fetchText(url, fetcher, timeoutMs);
  if (!homepage.ok) throw new Error("homepage_fetch_failed");
  const rawHtml = homepage.text;
  const html = stripHtml(rawHtml);
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  const description = metaContent(html, "name", "description");
  const canonical = linkHref(html, "canonical");
  const h1 = textBetween(html, "h1");
  const h2 = textBetween(html, "h2");
  const jsonLd = jsonLdTypes(rawHtml);
  const links = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1] ?? "").filter(Boolean).slice(0, 100);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0] ?? "");
  const imagesWithAlt = images.filter((img) => /\salt=["'][^"']+["']/.test(img));
  const robots = await optionalExists(url, "/robots.txt", fetcher, timeoutMs);
  const sitemap = input.sitemapUrl
    ? await optionalExactUrl(await assertPublicAuditUrl(input.sitemapUrl), fetcher, timeoutMs)
    : await optionalExists(url, "/sitemap.xml", fetcher, timeoutMs);
  const llms = await optionalExists(url, "/llms.txt", fetcher, timeoutMs);
  const llmsFull = await optionalExists(url, "/llms-full.txt", fetcher, timeoutMs);
  const hasProduct = jsonLd.includes("Product");
  const hasOrg = jsonLd.includes("Organization");
  const hasWebsite = jsonLd.includes("WebSite");
  const hasFaq = jsonLd.includes("FAQPage");
  const findings: SiteAuditFinding[] = [];
  if (!title) findings.push({ severity: "high", area: "seo", message: "Missing homepage title." });
  if (!description) findings.push({ severity: "medium", area: "seo", message: "Missing homepage meta description." });
  if (h1.length !== 1) findings.push({ severity: "medium", area: "content", message: "Homepage should have exactly one clear H1.", evidence: String(h1.length) });
  if (!robots.found) findings.push({ severity: "medium", area: "crawlability", message: "robots.txt was not found." });
  if (!sitemap.found) findings.push({ severity: "medium", area: "crawlability", message: "sitemap.xml was not found." });
  if (!llms.found) findings.push({ severity: "low", area: "aeo", message: "llms.txt was not found. This is a proposed AI-readable content signal, not a ranking guarantee." });
  if (!jsonLd.length) findings.push({ severity: "high", area: "structured_data", message: "No JSON-LD structured data detected." });
  if (!hasProduct) findings.push({ severity: "medium", area: "structured_data", message: "Product schema was not detected on the audited page." });
  const altCoverage = images.length ? imagesWithAlt.length / images.length : 1;
  if (altCoverage < 0.8) findings.push({ severity: "medium", area: "content", message: "Image alt coverage is below 80%.", evidence: `${Math.round(altCoverage * 100)}%` });
  const indicators = {
    robotsTxt: robots.found,
    sitemapXml: sitemap.found,
    llmsTxt: llms.found,
    jsonLd: jsonLd.length > 0,
    productSchema: hasProduct,
    organizationSchema: hasOrg,
    websiteSchema: hasWebsite,
    faqSchema: hasFaq
  };
  const scores = {
    structuredData: score([indicators.jsonLd, hasProduct, hasOrg, hasWebsite, hasFaq]),
    crawlability: score([robots.found, sitemap.found, Boolean(canonical)]),
    productSchema: score([hasProduct]),
    contentQuality: score([Boolean(title), Boolean(description), h1.length === 1, h2.length > 0, altCoverage >= 0.8]),
    conversionReadiness: score([links.some((link) => /product|collection|shop/i.test(link)), hasProduct, Boolean(description)]),
    seo: 0,
    aeo: 0,
    geo: 0,
    overall: 0
  };
  scores.seo = score([Boolean(title), Boolean(description), Boolean(canonical), robots.found, sitemap.found]);
  scores.aeo = score([h1.length === 1, h2.length > 0, hasFaq, llms.found]);
  scores.geo = score([hasOrg, hasWebsite, Boolean(input.brandName), links.length > 0]);
  scores.overall = Math.round((scores.seo + scores.aeo + scores.geo + scores.structuredData + scores.crawlability + scores.contentQuality + scores.conversionReadiness) / 7);
  const recommendedFixes = findings.map((finding) => finding.message);
  const priorityActions = recommendedFixes.slice(0, 5);
  return {
    url: url.toString(),
    auditedAt: new Date().toISOString(),
    scores,
    indicators,
    evidence: {
      title,
      description,
      canonical,
      h1,
      h2Count: h2.length,
      jsonLdTypes: jsonLd,
      internalLinkSample: links.filter((link) => link.startsWith("/") || link.startsWith(url.origin)).slice(0, 20),
      imageCount: images.length,
      imageAltCoverage: Math.round(altCoverage * 100),
      robotsUrl: robots.url,
      sitemapUrl: sitemap.url,
      llmsUrl: llms.url,
      llmsFullUrl: llmsFull.url,
      llmsFullFound: llmsFull.found,
      llmsTxtNote: "llms.txt is treated as a proposed AI-readable content signal, not a guaranteed ranking factor."
    },
    findings,
    recommendedFixes,
    priorityActions
  };
}

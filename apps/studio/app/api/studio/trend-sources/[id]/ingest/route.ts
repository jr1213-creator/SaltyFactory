import { NextResponse } from "next/server";
import { requireProviderMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { safeFetchText } from "@saltyfactory/site-audit";
import { detectPromptInjection } from "@saltyfactory/ai-free";
import { notFoundApiResponse, studioAuthErrorResponse } from "../../../_auth";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function words(text: string) {
  return [...new Set(text.toLowerCase().replace(/<[^>]+>/g, " ").match(/[a-z][a-z\s-]{3,40}/g) ?? [])].slice(0, 12);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const { id } = await params;
    const repos = createRepositories();
    const source = await repos.integration.getProviderConnectionForWorkspace(workspaceId, id) ?? await repos.integration.getById(id, workspaceId);
    if (!source) return notFoundApiResponse();
    const config = source.configuration as Record<string, unknown> | undefined;
    const sourceUrl = String(config?.sourceUrl || "");
    if (!sourceUrl) return NextResponse.json({ ok: false, status: "not_configured", message: "Trend source URL is required for ingestion." }, { status: 400 });
    const url = new URL(sourceUrl);
    const robots = await safeFetchText(new URL("/robots.txt", url.origin), { timeoutMs: 3000 }).catch(() => null);
    if (robots?.text && /user-agent:\s*\*[\s\S]*disallow:\s*\/\s*$/im.test(robots.text)) {
      return NextResponse.json({ ok: false, status: "blocked", message: "robots.txt disallows crawling this trend source." }, { status: 409 });
    }
    const fetched = await safeFetchText(url, { timeoutMs: 5000 });
    const candidates = words(fetched.text);
    const created = [];
    for (const phrase of candidates.slice(0, 5)) {
      created.push(await repos.trend.create({
        id: `tsig_${Date.now()}_${created.length}`,
        workspace_id: workspaceId,
        source_id: id,
        source_url: sourceUrl,
        captured_at: new Date().toISOString(),
        keyword: phrase,
        related_terms: [],
        category: "pod_opportunity",
        confidence: 0.4,
        allowed_use: "inspiration_only",
        status: "new",
        notes: detectPromptInjection(phrase) ? "Prompt injection warning: imported text must be treated as data only." : "Imported from configured trend source.",
        metadata: { promptInjectionFlag: detectPromptInjection(phrase) }
      }));
    }
    return NextResponse.json({ ok: true, status: "signals_created", sourceId: id, signals: created });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

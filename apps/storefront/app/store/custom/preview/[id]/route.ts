import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.APP_ENV === "production") {
    return NextResponse.json({ ok: false, error: "fixture_preview_disabled_in_production" }, { status: 404 });
  }
  const { id } = await params;
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960" role="img" aria-label="Fixture custom design preview"><rect width="960" height="960" fill="#e9f4f3"/><circle cx="720" cy="220" r="110" fill="#f7d9a2"/><path d="M160 570c140-130 270-130 390 0 90 95 170 95 250 0v150H160z" fill="#1f6f78"/><path d="M260 430c110-90 260-72 350 34-110 65-235 64-350-34z" fill="#0f1f2e"/><text x="480" y="685" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="54" font-weight="800" fill="#0f1f2e">CUSTOM PREVIEW</text><text x="480" y="746" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" fill="#416170">Fixture only ${safeId}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "no-store" } });
}

export const marketingWorkspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";
export const runtime = "nodejs";

export async function readJsonOrFormBody(req: Request) {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return req.json().catch(() => ({}));
  if (type.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries([...form.entries()].map(([key, value]) => [key, String(value)]));
  }
  return {};
}

export function safeStudioRedirect(req: Request, next: unknown, fallbackId: string) {
  const value = String(next ?? "").trim();
  if (!value || !value.startsWith("/studio/") || value.includes("//")) return null;
  return new URL(value.replace("{id}", encodeURIComponent(fallbackId)), req.url);
}

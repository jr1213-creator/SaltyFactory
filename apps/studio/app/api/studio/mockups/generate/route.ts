import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { requireProviderMutationPermission, requireWorkspaceMember } from "@saltyfactory/auth";
import { createRepositories, getDb, mockupTemplates } from "@saltyfactory/db";
import { studioAuthErrorResponse, notFoundApiResponse } from "../../_auth";

export const runtime = "nodejs";

const workspaceId = process.env.STUDIO_WORKSPACE_ID || "wks_default";

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90) || "mockup";
}

async function ensureInternalTemplate(productType: string, actorId: string) {
  const db = getDb();
  const id = `tmpl_internal_${safeSegment(productType)}`;
  const existing = await db.select().from(mockupTemplates).where(eq(mockupTemplates.id, id)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(mockupTemplates).values({
    id,
    workspaceId,
    name: `Internal ${productType} preview`,
    productType,
    canvas: { width: 1800, height: 2200, art_zone: { x: 450, y: 520, width: 900, height: 900 } },
    baseImagePath: "internal-preview-template",
    colorVariants: ["natural"],
    active: true,
    status: "active",
    notes: "Internal Studio preview only. This is not a Printify mockup.",
    createdBy: actorId,
    updatedBy: actorId
  } as any).returning();
  if (!created) throw new Error("mockup_template_create_failed");
  return created;
}

async function writeInternalMockup(productType: string, id: string) {
  const sharp = (await import("sharp")).default;
  const label = productType.replace(/_/g, " ").toUpperCase();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="2200">
    <rect width="1800" height="2200" fill="#f8fafc"/>
    <rect x="350" y="300" width="1100" height="1500" rx="120" fill="#e0f2f1" stroke="#0f766e" stroke-width="12"/>
    <rect x="520" y="640" width="760" height="760" rx="40" fill="#ffffff" stroke="#0f172a" stroke-width="8" stroke-dasharray="20 18"/>
    <text x="900" y="1010" text-anchor="middle" font-family="Arial" font-size="72" fill="#0f172a">APPROVED ART</text>
    <text x="900" y="1110" text-anchor="middle" font-family="Arial" font-size="42" fill="#0f766e">internal preview placement</text>
    <text x="900" y="1900" text-anchor="middle" font-family="Arial" font-size="58" fill="#334155">${label}</text>
  </svg>`);
  const buffer = await sharp(svg).png().toBuffer();
  const root = path.resolve(process.cwd(), ".saltyfactory-private", "mockups", safeSegment(workspaceId));
  await mkdir(root, { recursive: true });
  await writeFile(path.resolve(root, `${id}.png`), buffer);
  return `workspaces/${safeSegment(workspaceId)}/private/mockups/${id}.png`;
}

export async function GET(req: Request) {
  try {
    await requireWorkspaceMember(req, workspaceId);
    return NextResponse.json({ ok: true, mockups: await createRepositories().mockup.listByWorkspace(workspaceId) });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireProviderMutationPermission(req, workspaceId);
    const body = await req.json().catch(() => ({}));
    const assetId = String(body.asset_id || body.assetId || "");
    const productType = String(body.product_type || body.productType || "tee_front");
    const repos = createRepositories();
    const asset = await repos.asset.getById(assetId, workspaceId);
    if (!asset) return notFoundApiResponse();
    if (asset.approved_for_mockup !== true && asset.approvedForMockup !== true) {
      return NextResponse.json({ ok: false, status: "blocked", message: "Internal mockups require an approved asset with passing QA.", blockingReasons: ["asset_not_approved_for_mockup"] }, { status: 409 });
    }
    const template = await ensureInternalTemplate(productType, user.id);
    const mockupId = `mockup_${Date.now()}`;
    const storageKey = await writeInternalMockup(productType, mockupId);
    const mockup = await repos.mockup.create({
      id: mockupId,
      workspace_id: workspaceId,
      asset_id: assetId,
      template_id: template.id,
      color_variant: "natural",
      storage_bucket: "local-dev-private-assets",
      file_path: storageKey,
      width: 1800,
      height: 2200,
      status: "generated_internal_preview",
      approved_for_product: false,
      notes: "Internal preview only; not a provider mockup.",
      metadata: { kind: "internal_preview_mockup", provider: "internal", public: false },
      created_by: user.id,
      updated_by: user.id
    });
    return NextResponse.json({ ok: true, status: "internal_mockup_created", mockup });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

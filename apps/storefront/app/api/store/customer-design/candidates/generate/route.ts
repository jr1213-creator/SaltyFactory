import { NextResponse } from "next/server";
import { CUSTOMER_DESIGN_INVALID_BODY, attachPreviewAssetToCandidate, generateCustomerDesignCandidates } from "@saltyfactory/ai-free";
import { customerDesignError, readRequiredJson, stringField, tokenFrom, withCustomerDesignRepos } from "../../_shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readRequiredJson(req);
    const sessionId = stringField(body, "sessionId");
    const sessionToken = tokenFrom(req, body);
    if (!sessionId || !sessionToken) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    const output = await withCustomerDesignRepos(async ({ repos, workspaceId }) => {
      const generated = await generateCustomerDesignCandidates({
        repos,
        workspaceId,
        sessionId,
        sessionToken,
        requirementId: stringField(body, "requirementId") || undefined
      });
      const previewMode = stringField(body, "previewMode") === "fixture" ? "fixture" : undefined;
      const safeCandidate = generated.candidates.find((candidate) => candidate.status === "shown_to_customer");
      const preview = previewMode && safeCandidate ? await attachPreviewAssetToCandidate({
        repos,
        workspaceId,
        sessionId,
        sessionToken,
        candidateId: String(safeCandidate.id),
        mode: previewMode
      }) : null;
      return { ...generated, preview };
    });
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    return customerDesignError(error);
  }
}

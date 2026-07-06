import { NextResponse } from "next/server";
import { CUSTOMER_DESIGN_INVALID_BODY, recordCustomerDesignApproval } from "@saltyfactory/ai-free";
import { customerDesignError, readRequiredJson, stringField, tokenFrom, withCustomerDesignRepos } from "../../../_shared";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await readRequiredJson(req);
    const sessionId = stringField(body, "sessionId");
    const sessionToken = tokenFrom(req, body);
    if (!sessionId || !sessionToken) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    const eventType = stringField(body, "eventType") || "approved_for_purchase_product";
    if (!["selected", "rejected", "requested_more", "requested_edit", "approved_for_purchase_product"].includes(eventType)) {
      throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    }
    const output = await withCustomerDesignRepos(({ repos, workspaceId }) => recordCustomerDesignApproval({
      repos,
      workspaceId,
      sessionId,
      sessionToken,
      candidateId: id,
      eventType,
      customerNote: stringField(body, "customerNote")
    }));
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    return customerDesignError(error);
  }
}

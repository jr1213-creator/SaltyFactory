import { NextResponse } from "next/server";
import { CUSTOMER_DESIGN_INVALID_BODY, verifyCustomerDesignSession } from "@saltyfactory/ai-free";
import { customerDesignError, stringField, tokenFrom, withCustomerDesignRepos } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const body = {
      sessionId: url.searchParams.get("sessionId") ?? "",
      sessionToken: req.headers.get("x-customer-design-token") ?? ""
    };
    const sessionId = stringField(body, "sessionId");
    const sessionToken = tokenFrom(req, body);
    if (!sessionId || !sessionToken) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    const output = await withCustomerDesignRepos(async ({ repos, workspaceId }) => {
      await verifyCustomerDesignSession({ repos, workspaceId, sessionId, sessionToken });
      const job = await repos.customerDesign.publishJobs.getById(id, workspaceId);
      if (!job || job.session_id !== sessionId) throw new Error("customer_design_session_forbidden");
      return { job };
    });
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    return customerDesignError(error);
  }
}

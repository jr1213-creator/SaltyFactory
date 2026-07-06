import { NextResponse } from "next/server";
import { getCustomerDesignSessionDetail } from "@saltyfactory/ai-free";
import { customerDesignError, tokenFrom, withCustomerDesignRepos } from "../../_shared";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = { sessionToken: req.headers.get("x-customer-design-token") ?? "" };
    const detail = await withCustomerDesignRepos(({ repos, workspaceId }) => getCustomerDesignSessionDetail({
      repos,
      workspaceId,
      sessionId: id,
      sessionToken: tokenFrom(req, body)
    }));
    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return customerDesignError(error);
  }
}

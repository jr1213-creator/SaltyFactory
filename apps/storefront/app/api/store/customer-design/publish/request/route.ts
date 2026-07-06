import { NextResponse } from "next/server";
import { CUSTOMER_DESIGN_INVALID_BODY, requestCustomerSpecificProductCreation } from "@saltyfactory/ai-free";
import { customerDesignError, readRequiredJson, stringField, tokenFrom, withCustomerDesignRepos } from "../../_shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readRequiredJson(req);
    const sessionId = stringField(body, "sessionId");
    const sessionToken = tokenFrom(req, body);
    const candidateId = stringField(body, "candidateId");
    if (!sessionId || !sessionToken || !candidateId) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    const output = await withCustomerDesignRepos(({ repos, workspaceId }) => requestCustomerSpecificProductCreation({
      repos,
      workspaceId,
      sessionId,
      sessionToken,
      candidateId
    }));
    return NextResponse.json({ ok: output.ok, output }, { status: output.ok ? 200 : 409 });
  } catch (error) {
    return customerDesignError(error);
  }
}

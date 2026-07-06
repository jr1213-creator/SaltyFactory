import { NextResponse } from "next/server";
import { CUSTOMER_DESIGN_INVALID_BODY, handleCustomerDesignMessage } from "@saltyfactory/ai-free";
import { customerDesignError, readRequiredJson, stringField, tokenFrom, withCustomerDesignRepos } from "../_shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readRequiredJson(req);
    const sessionId = stringField(body, "sessionId");
    const sessionToken = tokenFrom(req, body);
    const messageText = stringField(body, "messageText");
    if (!sessionId || !sessionToken || !messageText) throw new Error(CUSTOMER_DESIGN_INVALID_BODY);
    const output = await withCustomerDesignRepos(({ repos, workspaceId }) => handleCustomerDesignMessage({
      repos,
      workspaceId,
      sessionId,
      sessionToken,
      messageText
    }));
    return NextResponse.json({ ok: true, output });
  } catch (error) {
    return customerDesignError(error);
  }
}

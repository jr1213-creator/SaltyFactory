import { NextResponse } from "next/server";
import { createCustomerDesignSession, getCustomerDesignSessionDetail } from "@saltyfactory/ai-free";
import { asRecord, customerDesignError, readRequiredJson, stringField, tokenFrom, withCustomerDesignRepos } from "../_shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await readRequiredJson(req);
    const coarseLocation = asRecord(body.coarseLocation);
    const result = await withCustomerDesignRepos(({ repos, workspaceId }) => createCustomerDesignSession({
      repos,
      workspaceId,
      sourceRoute: stringField(body, "sourceRoute") || "/store/custom",
      anonymousId: stringField(body, "anonymousId"),
      coarseLocation: Object.keys(coarseLocation).length ? coarseLocation : undefined
    }));
    return NextResponse.json({ ok: true, session: result.session, sessionToken: result.sessionToken });
  } catch (error) {
    return customerDesignError(error);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const body = {
      sessionId: url.searchParams.get("sessionId") ?? "",
      sessionToken: req.headers.get("x-customer-design-token") ?? ""
    };
    if (!body.sessionId || !body.sessionToken) throw new Error("customer_design_invalid_body");
    const detail = await withCustomerDesignRepos(({ repos, workspaceId }) => getCustomerDesignSessionDetail({
      repos,
      workspaceId,
      sessionId: body.sessionId,
      sessionToken: tokenFrom(req, body)
    }));
    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return customerDesignError(error);
  }
}

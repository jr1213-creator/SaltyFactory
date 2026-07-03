import { NextResponse } from "next/server";
import { studioAuthErrorResponse } from "../../../../../_auth";
import { withBusinessWrite, workspaceId } from "../../../../_shared";

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return withBusinessWrite(req, async (repos, user, body) => {
      const transaction = await repos.business.bankTransactions.getById(id, workspaceId);
      if (!transaction) return NextResponse.json({ ok: false, status: "not_found" }, { status: 404 });
      const updated = await repos.business.bankTransactions.update(id, {
        business_category: body.businessCategory || body.business_category || transaction.business_category,
        classification_status: "confirmed",
        notes: body.notes || transaction.notes,
        updated_by: user.id
      } as any);
      return NextResponse.json({ ok: true, status: "classified", transaction: updated });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

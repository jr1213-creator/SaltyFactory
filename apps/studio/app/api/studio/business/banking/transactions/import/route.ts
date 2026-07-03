import { studioAuthErrorResponse } from "../../../../_auth";
import { json, nowId, withBusinessWrite, workspaceId } from "../../../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user, body) => {
      const rows = Array.isArray(body.transactions) ? body.transactions : [];
      let connection = (await repos.business.bankConnections.listByWorkspace(workspaceId)).find((row) => row.provider === "manual" || row.provider === "novo");
      if (!connection) {
        connection = await repos.business.bankConnections.create({
          id: nowId("bankconn"),
          workspace_id: workspaceId,
          provider: String(body.provider || "manual"),
          connection_method: "manual_import",
          institution_name: String(body.institutionName || "Novo manual import"),
          masked_account: body.maskedAccount || null,
          status: "connected",
          consent_status: "granted",
          metadata: { readOnly: true },
          created_by: user.id,
          updated_by: user.id
        } as any);
      }
      const created = [];
      for (const raw of rows as Record<string, unknown>[]) {
        created.push(await repos.business.bankTransactions.create({
          id: nowId("banktxn"),
          workspace_id: workspaceId,
          bank_connection_id: connection.id,
          external_transaction_id: raw.externalTransactionId || raw.external_transaction_id || null,
          transaction_date: String(raw.transactionDate || raw.transaction_date || new Date().toISOString().slice(0, 10)),
          description: String(raw.description || "Manual imported transaction"),
          merchant_name: raw.merchantName || raw.merchant_name || null,
          amount: String(raw.amount || 0),
          currency: String(raw.currency || "USD"),
          category: raw.category || null,
          business_category: raw.businessCategory || raw.business_category || null,
          classification_status: "owner_review",
          confidence: raw.confidence ? String(raw.confidence) : null,
          notes: raw.notes || null,
          created_by: user.id,
          updated_by: user.id
        } as any));
      }
      return json({ ok: true, status: "manual_imported", connection, transactions: created });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

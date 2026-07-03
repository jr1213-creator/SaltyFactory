import { requireDraftMutationPermission } from "@saltyfactory/auth";
import { createRepositories } from "@saltyfactory/db";
import { studioAuthErrorResponse } from "../../../../_auth";
import { actionResponse, convertSuggestionToHireRequest, workspaceId } from "../../_shared";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireDraftMutationPermission(req, workspaceId);
    const { id } = await context.params;
    return actionResponse(await convertSuggestionToHireRequest(createRepositories(), id, user.id));
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

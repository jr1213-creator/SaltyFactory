import { createListingDraft, listResource } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "listingDraftV1");
}

export async function POST(req: Request) {
  return createListingDraft(req);
}


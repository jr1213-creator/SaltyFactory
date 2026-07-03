import { createSetupHelpRequest, handleSetupHelpList } from "../_shared";

export async function GET(req: Request) {
  return handleSetupHelpList(req);
}

export async function POST(req: Request) {
  return createSetupHelpRequest(req);
}

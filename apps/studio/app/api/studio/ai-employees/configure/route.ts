import { configureAiEmployee } from "../../_v1";

export async function POST(req: Request) {
  return configureAiEmployee(req);
}


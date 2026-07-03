import { handleImageGenerationValidate } from "../../_shared";

export async function POST(req: Request) {
  return handleImageGenerationValidate(req);
}

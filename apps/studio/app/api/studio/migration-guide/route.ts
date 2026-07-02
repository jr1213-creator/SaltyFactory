import { listResource, saveMigrationGuide } from "../_v1";

export async function GET(req: Request) {
  return listResource(req, "migrationWizard");
}

export async function POST(req: Request) {
  return saveMigrationGuide(req);
}


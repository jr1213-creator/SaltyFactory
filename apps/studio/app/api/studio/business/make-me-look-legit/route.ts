import { studioAuthErrorResponse } from "../../_auth";
import { createBusinessCardPacket, generateBusinessDocument, json, withBusinessWrite } from "../_shared";

export async function POST(req: Request) {
  try {
    return withBusinessWrite(req, async (repos, user) => {
      const documentTypes = [
        "one_page_business_summary",
        "brand_guidelines",
        "capability_statement",
        "letterhead",
        "product_line_sheet"
      ];
      const documents = [];
      for (const documentType of documentTypes) {
        const result = await generateBusinessDocument(repos, { documentType, title: documentType.replace(/_/g, " ") }, user.id);
        if (result.ok) documents.push(result.document);
      }
      const businessCard = await createBusinessCardPacket(repos, { style: "polished_coastal_western" }, user.id);
      return json({
        ok: true,
        status: "legitimacy_bundle_created",
        documents,
        businessCard,
        note: "External submissions and print orders are not placed by this action."
      });
    });
  } catch (error) {
    return studioAuthErrorResponse(error);
  }
}

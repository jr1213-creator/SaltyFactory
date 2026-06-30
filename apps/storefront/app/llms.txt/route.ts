export function GET() {
  return new Response([
    "# Salty Cowhide Co.",
    "Public storefront for coastal western made-to-order goods.",
    "Allowed public sections: home, collections, approved products, drops, about, FAQ, size guide, legal pages.",
    "Private SaltyFactory Studio data, trend signals, prompts, provider secrets, audit logs, and unapproved products are not public content."
  ].join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}

const routes = ["", "collections", "drops", "about", "size-guide", "faq", "legal/privacy", "legal/terms"];

export function GET() {
  const urls = routes.map((route) => `<url><loc>https://saltycowhide.com/${route}</loc></url>`).join("");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { "content-type": "application/xml; charset=utf-8" } });
}

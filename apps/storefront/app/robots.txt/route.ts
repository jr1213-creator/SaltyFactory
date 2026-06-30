export function GET() {
  return new Response("User-agent: *\nAllow: /\nDisallow: /studio\nDisallow: /api/studio\nSitemap: https://saltycowhide.com/sitemap.xml\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
}

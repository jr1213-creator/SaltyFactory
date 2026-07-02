# Open Source Architecture Decisions

SaltyFactory uses reference models without bundling or copying their code in this pass.

- Twenty-style custom object/reference architecture: inspiration for configurable business objects.
- SuiteCRM: inspiration for leads, opportunities, quotes, service cases, and customer profiles.
- Chatwoot: inspiration for support inbox patterns.
- Mautic/listmonk: inspiration for campaign and consent workflows; license review required before bundling.
- PostHog/Umami: inspiration for customer intelligence and event tracking; no session replay/CDP clone in v1.
- Cal.diy: inspiration for scheduling readiness and booking request foundations.
- geo-optimizer-style scoring: inspiration for SEO/AEO/GEO readiness; no ranking guarantee.
- Mixpost: future social scheduling reference.
- Activepieces: future automation integration boundary.
- Crawl4AI: future crawl/research target.
- ComfyUI/Qwen/FLUX: future image-generation infrastructure only.

AGPL/GPL projects such as Firecrawl/Postiz/SuiteCRM require license review before bundling. They are references, not dependencies, unless explicitly installed and reviewed later.

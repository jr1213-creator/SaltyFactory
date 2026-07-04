# Tactile Brutalist Brand System v1

Status: implemented first pass for Studio shell, shared tokens, bento primitives, and key POD workflow surfaces.

## Direction

SaltyFactory Studio should feel like a premium, human-designed AI business OS for POD founders: coastal cowgirl, practical, technical, textured, and owner-gated. The interface uses visible structure, strong borders, tactile paper/canvas surfaces, and typography as layout architecture. It should not look like generic blue SaaS, purple AI gradients, glassmorphism, or pill-heavy shadcn defaults.

## Palette

Studio uses the exact `--sf-*` palette in `apps/studio/app/globals.css`:

- ink/navy/deep navy for structure and primary text
- cream/warm paper/sand/khaki for backgrounds and tactile surfaces
- coral/coral-deep for owner action and emphasis
- turquoise/spa blue/seafoam for connected, active, and productive states
- chocolate/leather/clay for western grounding and owner-gated/warning context
- success/warning/danger only for semantic state

No new dominant primary colors should be introduced without updating this document and the contrast audit.

## Tactile Brutalism

Rules:

- explicit container boundaries
- strong 1px and 2px borders
- engineered grids and visible layout architecture
- low or zero fake shadows
- rectangular command tabs and action buttons
- fewer floating pills
- compact badges only for status chips
- deliberate spacing on a 4/8px scale

The goal is not harsh anti-design. Product clarity wins over novelty.

## Coastal Cowgirl Textures

Textures are CSS-generated:

- `.sf-texture-topo`: coastal/topographic linework for page headers and guided setup moments
- `.sf-texture-sand`: subtle grain for empty states and setup surfaces
- `.sf-texture-canvas`: canvas weave for cards and command panels
- `.sf-texture-denim`: light denim hint for artifact/product cards
- `.sf-grid-paper`: operational grid paper for Studio backgrounds
- `.sf-stitch-border`: western stitch accent for selected or owner-gated items

Textures must stay subtle, performant, and readable. Do not add heavy background image assets for the Studio texture system.

## Typography

- page titles are editorial and architectural
- section titles name the business job, not generic dashboards
- metadata labels may use compact uppercase
- IDs and technical references may use mono
- owner-facing statuses must be humanized, not raw `snake_case`

Examples:

- use `Generated art gallery`, not `Image Generation Jobs`
- use `Choose the product shell`, not `Printify Product Inputs`
- use `Launch gate control`, not a generic publish dashboard

## Guardrails

- no secret values in frontend output
- no raw env vars in default owner views
- no raw JSON in normal owner workflows
- no POST API route hrefs
- no fake provider success
- no broken image placeholders replacing real previews
- no live publish enablement through visual changes

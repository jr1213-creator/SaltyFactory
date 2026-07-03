# Studio Information Architecture v1

Status: implemented shell polish, provider/auth verified by existing route gates.

## Navigation Model

Studio now uses four navigation layers:

| Layer | Purpose | Implementation |
| --- | --- | --- |
| Top command centers | Fast switching between the main operating areas | `StudioCommandCenterNav` |
| Active workflow context | Shows current area, breadcrumb, description, and next owner action | `StudioWorkflowContextPanel` |
| POD launch stages | Keeps the core product factory workflow visible from any Studio page | `StudioPodStageRail` |
| Module explorer | Full route inventory for deeper pages without making every link top-level | `StudioNavigation` |

Primary command centers:

- Home
- POD
- AI
- Business
- Customer
- Marketing
- Setup

The full module explorer still exposes every existing Studio route, but it is no longer the first IA layer a user has to parse.

## UX Rules

- Keep core routes stable; do not rename routes just to improve labels.
- Put operating areas in the topbar, not every secondary page.
- Keep provider setup and safety blockers visible through `/studio/setup`.
- Keep POD stages visible because the product factory is the core workflow.
- Use active breadcrumbs and section descriptions so deep pages still have context.
- Use clear labels like `POD`, `AI`, `Business`, and `Setup`; avoid internal implementation names.

## Current Verified Behavior

- `/studio` renders a Command Center Launchpad.
- Topbar command centers are generated from `STUDIO_COMMAND_CENTER_LINKS`.
- Sidebar active context is generated from `getActiveStudioNavContext()`.
- POD stage links are generated from `STUDIO_POD_STAGE_LINKS`.
- Module explorer preserves existing route coverage and active-section auto-expansion.
- No auth bypass was added; Studio layout still requires Supabase-backed Studio auth and workspace authorization.

## Remaining UX Gaps

- Authenticated visual baselines still require a browser-safe Supabase Playwright storage-state fixture.
- Some individual deep pages still use dense tables and should be progressively converted to shared workflow/detail layouts.
- The topbar command menu uses native `details` today; Radix dropdown primitives remain a future design-system hardening step if the dependency is added intentionally.

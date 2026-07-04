# Studio Navigation IA v1

Status: implemented first pass in `apps/studio/app/studio/StudioNavigation.tsx`.

## Goal

Studio navigation should be a professional command system, not a long route dump. The global nav answers:

- where is the owner working?
- what workflow area is active?
- what is the next useful route?
- what remains gated or blocked?

It must never link to POST API routes, placeholder routes, or raw diagnostic endpoints as primary owner actions.

## Top-Level Areas

Global command areas:

1. Home
2. POD Factory
3. AI Workforce
4. Business
5. Storefront
6. Marketing
7. Customers
8. Operations

Each area has a keyboard-aware mega menu with groups, item descriptions, compact status badges, and validated Studio routes.

## Mega Menu Structure

POD Factory:

- Launch Pipeline: POD Launch Studio, Product Builder, Publish Review, Launch Packet
- Creative Production: Briefs, Image Generation, Assets, Mockups
- Commerce Setup: Printify Catalog, Shopify Products, Pricing & Margins, POD Batches

AI Workforce:

- Review: AI Employees, Approval Queue
- Workforce: Hiring Desk, Improvement Desk
- Model Ops: Model Registry, Model Usage, Model Evaluations

Business:

- Command: Business Command Center, Business Profile, Goals
- Decisions: Opportunities, Decision Memos, Forecasts
- Legitimacy: Documents, Business Card / Print Studio, Authority Requests

Storefront:

- Shopify / Printify: Shopify Products, Printify Catalog, Publish Review, Product Drafts
- Providers: Provider Connections, Integrations, Guided Setup

Marketing:

- Command: Marketing Command Center, Campaigns, Approvals
- Channels: Social, Email, Ads
- Visibility: Search / AEO / GEO, Tracking / UTMs, Assets

Customers:

- Command: Customer Command Center
- CRM: Customers, Leads, Segments, Opportunities
- Ops: Inbox, Campaigns, Service Cases, Scheduling

Operations:

- Setup: Guided Setup, Quick Setup, Feature Readiness, Provider Setup
- Diagnostics: Integrations, Storage Readiness, Security / Guardrails
- Admin: Settings, Audit Events

## Contextual Sidebar

The left sidebar is now contextual. It shows:

- current section title
- one-sentence purpose
- primary next action
- setup/help action
- active area routes
- POD stage rail only inside the POD Factory context

It should not duplicate every Studio module on every page.

## Interaction Rules

- Escape closes an open mega menu.
- Click outside closes an open mega menu.
- Mobile uses an accordion drawer.
- Menus stay inside the viewport.
- Desktop navigation does not rely on a horizontal scrollbar.
- Every item has an icon token, label, description, route, and optional compact status.

## Owner-Facing Language

Use workflow language:

- Browse Printify catalog
- Create mockup
- Open product draft
- Review launch packet
- Connect provider

Avoid default owner-facing labels like:

- Open setup when already connected
- Requires `PRINTIFY_API_TOKEN`
- `setup_needed`
- raw provider status strings

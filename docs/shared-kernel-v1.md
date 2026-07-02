# Shared Kernel v1

SaltyFactory now has a shared control-plane kernel for Launch, Account, Customer, Marketing, and future vertical packs.

## Implemented Primitives

- `provider_connections`: readiness/status only; no tokens or secrets.
- `source_records`: provenance for manual, imported, provider-reported, rule-based, AI-generated, and owner-verified claims.
- `events`: owner-facing polymorphic timeline events.
- `audit_log`: system-level audit history separate from owner timelines.
- `approvals`: polymorphic owner review items.
- `tasks` and `notes`: polymorphic follow-up and context records.
- `recommendations`: rule-based/system/AI next actions with confidence and source.
- `readiness_scores`: launch/provider/ad/SEO/campaign/customer/tracking scoring.
- `export_packages`: proof packs, readiness reports, growth plans, campaign/ad/social/email exports.
- `assets`: specs, briefs, and file refs only; no generated media claims.
- `templates`, `automation_rules`, `segments`, `vertical_packs`: config-driven vertical operating model.

## Compatibility

Existing `crm_*` tables remain active. Customer-specific CRM notes/tasks/timeline continue to work. Cross-entity Marketing and non-customer follow-ups use shared polymorphic `tasks`, `notes`, and `events` where the CRM table shape is intentionally customer-centered.

## Security

Shared APIs require Studio auth and workspace membership. Mutation APIs require owner/admin draft mutation permission. Workspace IDs are injected server-side, caller-supplied workspace/account IDs are ignored, and secret-like fields are stripped/redacted.

## RLS / Isolation

This pass preserves the repo’s current server-side workspace isolation posture. Table-level RLS was not added because the existing architecture routes Studio reads/writes through authenticated server repositories. API-level tests cover workspace injection and cross-workspace isolation.

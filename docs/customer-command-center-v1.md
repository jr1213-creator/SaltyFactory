# Customer Command Center v1

SaltyFactory Customer Command Center is the native customer success foundation for SaltyCowhide.com. It organizes customers, leads, follow-ups, segments, support readiness, capture forms, campaign drafts, customer intelligence, scheduling readiness, and rule-based next actions in one protected Studio module.

## Functional Now

- Protected Studio routes for Customer Command Center, customers, customer profiles, segments, capture, inbox, campaigns, intelligence, scheduling, leads, opportunities, and service cases.
- Create/edit/detail flows for customers, leads, opportunities, service cases, capture forms, customer campaigns, manual conversations, conversation messages, appointment types, and manual intelligence events.
- Customer profiles can create notes and follow-up tasks; task completion writes owner-facing events.
- Non-customer follow-ups use the shared polymorphic task/note/event kernel where the CRM tables are intentionally customer-centered.
- `/studio/customer-command-center/setup` seeds customer defaults idempotently.
- Workspace-owned CRM database tables for customer identity, Customer 360, timeline, activity, leads, opportunities, quotations, deals, service cases, conversations, campaigns, forms, consent, events, cohorts, AI insights, automation, imports, sync state, and scheduling readiness.
- Protected JSON APIs under `/api/studio/customer-command-center/summary` and `/api/studio/crm/*`.
- Deterministic rule-based next actions labeled as rule-based AI suggestions.
- Default segment definitions, task templates, capture form templates, message templates, campaign ideas, and appointment types.
- Source-of-truth labels for manual entry, Shopify, contact forms, imports, support, website events, campaigns, scheduling, system-generated records, and AI suggestions.
- Honest empty states when there are no customers, Shopify orders, abandoned carts, support conversations, web events, campaign analytics, or bookings.

## Foundation Only

- Email/SMS sending is not implemented.
- Website chat/email/social inbox integration is not implemented.
- Public embeddable capture scripts are not implemented.
- Website/customer behavior tracking is not implemented unless future real events are ingested.
- Session replay, surveys, feature flags, experiments, and funnels are readiness foundations only.
- Calendar sync and provider booking availability are not implemented.
- Quotes and deals are schema/API foundation only in this pass.
- No fake revenue, order history, support data, email delivery, calendar availability, or customer analytics is created.

## Rule-Based AI

Customer next actions are deterministic rule-based suggestions. They do not call an external model and must not be described as provider-generated AI output.

Examples:

- Missing email/phone creates an "Add contact details" suggestion.
- Repeat purchase data can suggest VIP review only when real order counts exist.
- Abandoned cart suggestions are not generated unless cart event data exists.
- Campaign enrollment reminders require consent status.

## External Data Requirements

Shopify credentials/customer sync are required for real customer/order history, lifetime value, average order value, repeat buyer/VIP/jewelry/digital buyer membership, and abandoned cart candidates.

Future support inbox integration is required for live chat conversations, email inbox conversations, and social support channels.

Future marketing/email provider integration is required for live email sends, email opens/clicks, and campaign delivery analytics.

Future analytics/customer tracking is required for website behavior, conversion funnels, and behavioral cohorts from page/product/cart/checkout events.

Future scheduling/calendar sync is required for live availability, calendar conflict checks, and confirmed booking automation.

## Reference Models

This module is inspired by enterprise patterns from SuiteCRM, Chatwoot, Mautic, PostHog, and Cal.diy. These projects are reference models only. SaltyFactory does not bundle, iframe, or copy code from those projects in this implementation. Any future integration must be separately reviewed for license, security, and provider requirements.

## Safe Claims

Safe to say:

- SaltyFactory includes a native Customer Command Center foundation.
- SaltyFactory organizes customers, leads, segments, tasks, capture forms, campaign drafts, support readiness, intelligence readiness, and scheduling readiness.
- Customer next actions are rule-based suggestions and require owner review.
- Live provider data appears only after credentials and real syncs are configured.

Not safe to say yet:

- SaltyFactory sends email/SMS campaigns.
- SaltyFactory provides live chat.
- SaltyFactory records session replay.
- SaltyFactory has synced Shopify customer/order history unless the provider is configured and sync has run.
- SaltyFactory has abandoned cart automation.
- SaltyFactory has live calendar booking sync.

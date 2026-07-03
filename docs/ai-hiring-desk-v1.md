# AI Hiring Desk v1

Status: functional v1, owner-gated.

Implemented:
- `/studio/ai-employees/hiring`
- `GET/POST /api/studio/ai-employees/hiring`
- `POST /api/studio/ai-employees/hiring/propose`
- detail, approve, reject, needs-edits, and create-employee routes
- persisted hire requests, role specs, employee definitions, permission scopes, approval records, events, and audit events

Rules:
- A hire request cannot create an employee before owner approval.
- Created employees are `setup_needed`.
- Provider actions are recorded as `provider_action_blocked`.
- Global forbidden actions include publish, send, spend, sync, delete, DNS changes, secrets, bank/EIN access, external submissions, print orders, transfers, and payments.

Not implemented:
- Autonomous hiring.
- Live provider authority grants.
- AI self-modification.

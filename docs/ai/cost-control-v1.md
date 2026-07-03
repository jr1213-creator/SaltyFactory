# AI Cost Control v1

Status: functional routing policy and usage audit foundation.

Implemented:
- Cost tier on model providers.
- Cost estimate metadata on models.
- Usage events with task type, risk, sensitivity, status, token counts, estimated cost, and duration when known.
- Escalation requests instead of automatic premium fallback.

Policy:
- Prefer local/self-hosted models for low-risk repetitive work.
- Use hosted open models for medium-risk drafting only when configured and approved.
- Keep premium closed providers optional, disabled by default, and owner-gated.
- Do not route dangerous actions through models.

Remaining config blockers:
- A model provider must be configured and verified.
- A model must be evaluated and approved.
- Employee model assignments must be owner-reviewed for higher-risk work.

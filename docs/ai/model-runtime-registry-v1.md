# AI Model Runtime Registry v1

Status: partial, owner-gated, config-blocked until models are configured and approved.

Implemented:
- `ai_model_providers`, `ai_models`, `ai_employee_model_assignments`, `ai_model_evaluations`, and `ai_model_usage_events` tables.
- Server-side routing service in `@saltyfactory/ai-free`.
- Studio routes: `/studio/ai-employees/models`, `/studio/ai-employees/models/[id]`, `/studio/ai-employees/model-evals`, `/studio/ai-employees/model-usage`.
- Protected APIs for model registry, model detail, evals, and usage.
- Sanitized provider responses that do not expose base URLs, API tokens, EIN, bank data, or provider credentials.

Routing truth:
- Low-risk internal tasks can use approved configured local/open models.
- Sensitive/high-authority input blocks without authority approval.
- Publish, spend, send, sync, delete, bank connection, EIN use, provider credentials, external orders, and application submission are never routed to a model.
- Stronger model escalation creates an owner-reviewed capability request. It does not call a premium model automatically.

Future:
- Provider-specific live text generation adapters for hosted providers.
- Automated eval execution. Current v1 stores owner/manual eval evidence.

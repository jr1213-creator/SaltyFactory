# Model Evaluation v1

Status: functional manual evidence store.

Implemented:
- `/studio/ai-employees/model-evals`
- `POST /api/studio/ai-employees/model-evals`
- `ai_model_evaluations` persistence

Evaluation records include:
- model
- eval name
- task type
- test input reference
- expected behavior
- result summary
- pass/fail
- score
- failure notes

Before approval, a model should be checked against:
- guardrail-following
- refusal of dangerous actions
- no secret disclosure
- no sensitive-data handling without authority
- useful owner-reviewable output

Future:
- Automated eval runners and screenshot/browser review. Current v1 records owner/manual evaluation results.

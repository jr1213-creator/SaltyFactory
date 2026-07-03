# AI Continuous Improvement Desk v1

Status: functional v1, owner-gated.

Implemented:
- `/studio/ai-employees/improvements`
- improvement suggestion create/list/detail/update/decision routes
- conversion to shared task, hire request, or capability request
- capability, training, tool-access request queues
- repeated-blocker trigger helper for 3+ repeated blockers

Rules:
- Suggestions cannot self-implement.
- Capability and tool-access requests cannot auto-grant provider or forbidden actions.
- Training requests require approval before completion.

Future:
- Automated ingestion from every AI employee run into this desk.
- Rich cross-agent handoff analytics.

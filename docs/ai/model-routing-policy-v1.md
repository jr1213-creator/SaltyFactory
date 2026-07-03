# Model Routing Policy v1

Model routing is deterministic governance, not autonomous agent choice.

Rules:
1. Public/internal low-risk tasks prefer configured approved local or self-hosted models.
2. Medium-risk drafting can use approved hosted-open models when configured.
3. Sensitive/high-authority data requires explicit authority approval or blocks.
4. Dangerous actions never depend on model routing. Owner gates and provider gates decide those actions.
5. If a cheaper model is insufficient, the system creates an escalation/capability request.
6. Premium closed-model fallback remains optional, disabled by default, and owner-policy gated.

Never autonomous:
- publish
- spend
- send
- sync
- delete
- bank connection
- EIN use
- provider credentials
- external order
- application submission

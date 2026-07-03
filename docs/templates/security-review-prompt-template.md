# Security Review Prompt Template

Review SaltyFactory changes for security and authority defects.

Read first:
- `AGENTS.md`
- `docs/standards/ai-software-factory-prompt-standard-v1.md`
- changed API routes
- auth helpers
- repository calls
- provider clients
- tests

Check:
- auth required on Studio APIs
- workspace_id injected server-side
- object-level authorization
- no caller-supplied workspace trust
- no frontend provider tokens
- no service-role keys in browser
- no secret-like API responses
- sanitized provider errors
- audit events for sensitive actions
- owner gates for publish/send/spend/sync/delete/banking/orders
- AI employees cannot self-grant authority
- sensitive data masked by default

Output:
1. Critical security findings
2. Authority-gate violations
3. Secret exposure risks
4. Missing tests
5. Required fixes

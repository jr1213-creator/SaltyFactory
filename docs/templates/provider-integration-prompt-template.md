# Provider Integration Prompt Template

Task:
Implement or review a provider integration path.

Read first:
- `AGENTS.md`
- `docs/standards/ai-software-factory-prompt-standard-v1.md`
- provider package/client
- provider API routes
- Studio UI callers
- credential/storage helpers
- related tests/docs

Requirements:
1. Server-side provider client only.
2. Explicit feature flag and required config.
3. Workspace authorization.
4. Secrets never returned or logged.
5. Missing config returns setupRequired/blockingReasons.
6. UI has a real caller and setup path.
7. Success path persists provider refs from real provider response.
8. No fake IDs, costs, images, analytics, sends, spends, orders, publish, or sync.
9. Tests mock realistic provider success and blocked failures.
10. Docs label config-blocked/future paths honestly.

Report:
1. UI caller
2. API route
3. Provider calls
4. Persistence/downstream reads
5. Tests
6. Remaining config blockers

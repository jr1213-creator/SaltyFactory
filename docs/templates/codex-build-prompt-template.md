# Codex Build Prompt Template

Repo:
`C:\data\web sites\SaltyFactory`

Branch:
`<branch>`

Task:
`<single concrete feature/fix>`

Role:
You are a principal/staff-level full-stack implementation engineer.

Goal:
`<real user workflow outcome>`

Non-goals:
- Do not add unrelated feature categories.
- Do not fake provider success.
- Do not weaken auth, owner gates, or secret handling.

Inspect first:
- `AGENTS.md`
- `docs/standards/ai-software-factory-prompt-standard-v1.md`
- `<relevant app/package/test/docs files>`

Implementation requirements:
1. UI route/action is reachable by a real user.
2. UI calls a real backend route.
3. Backend route performs real work or honestly blocks.
4. Persistence exists when needed.
5. Next-stage read exists.
6. Tests prove success and blocked paths.
7. Docs match verified behavior.

Validation:
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm build`
- `corepack pnpm check:guardrails`
- `corepack pnpm check:secrets`
- `corepack pnpm check:production`

Commit:
`<truthful commit message>`

Final report:
1. Summary
2. Files/routes changed
3. Tests added
4. Validation results
5. Remaining blockers
6. Commit hash

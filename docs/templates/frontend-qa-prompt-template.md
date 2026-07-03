# Frontend QA Prompt Template

Task:
Run a browser/screenshot-driven Studio frontend QA pass.

Read first:
- `AGENTS.md`
- `docs/standards/ai-software-factory-prompt-standard-v1.md`
- `docs/frontend-design-system-v1.md` if present
- Playwright config and e2e tests

Routes:
- `<list routes>`

Check:
- unauthenticated redirect for protected Studio routes
- authenticated route render when fixture exists
- top nav/sidebar visible
- no console errors
- no raw env leakage outside Advanced setup views
- no dead disabled/config states
- empty states include next action
- setup blockers include action/guide/help
- no text overlap or horizontal overflow
- disabled buttons explain why

Validation:
- `corepack pnpm frontend:qa`
- `corepack pnpm check:frontend-contrast`
- screenshot review when authenticated fixture exists

Report:
1. Routes tested
2. Screenshot/browser findings
3. Fixes made
4. Remaining auth fixture blockers
5. Validation results

# Claude Review Prompt Template

Review the current SaltyFactory change as a senior code reviewer.

Read first:
- `AGENTS.md`
- `docs/standards/ai-software-factory-prompt-standard-v1.md`
- changed files
- related tests

Review stance:
- Findings first, ordered by severity.
- Focus on bugs, fake completion, missing wiring, security, auth, workspace isolation, provider honesty, and missing tests.
- Do not summarize before findings.

Check:
- UI action exists and calls real API.
- API persists real state or honestly blocks.
- Next pipeline stage can read the state.
- Tests cover success and blocked paths.
- Docs do not overclaim.
- No secrets or provider tokens leak.
- AI employees cannot self-authorize.
- No fake provider IDs/success.

Output:
1. Findings
2. Open questions
3. Test gaps
4. Documentation gaps

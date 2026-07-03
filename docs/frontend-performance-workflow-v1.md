# Frontend Performance Workflow v1

Status: documented workflow; no production instrumentation added.

How to inspect:
1. Run `corepack pnpm dev:studio`.
2. Open the target route in a real browser.
3. Use React DevTools Profiler for:
   - `/studio/pod-launch-studio`
   - `/studio/publish-review`
   - `/studio/printify-catalog`
   - `/studio/ai-employees`
   - `/studio/ai-employees/models`
   - `/studio/business`
   - `/studio/business/print-studio`
4. Check whether table filters, provider cards, and batch retry controls rerender the whole page.

What matters:
- Repeated product/batch rows should not rerender when unrelated setup panels change.
- Provider result panels should not re-run expensive JSON formatting on every keystroke.
- Business card preview SVG should render from stable props.

What not to over-optimize:
- Static server-rendered dashboard cards.
- Empty states.
- One-time setup forms.

React Scan:
- Not installed in production.
- If added later, keep it dev-only and never ship it in Studio bundles.

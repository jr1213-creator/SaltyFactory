# Honesty And Readiness Model

Every SaltyFactory surface must be classified.

1. Fully functional v1: real persistence, API, UI, tests, and no external provider claim unless verified.
2. Honest foundation feature: schema/API/UI foundation exists, but live execution provider is not implemented.
3. Manual/export-ready feature: records can be created, edited, copied, exported, or used manually.
4. Future integration placeholder: clearly labeled future provider or automation work.

Forbidden: shallow fake features, fake green checks, fake metrics, fake customer/order/cart data, fake provider connections, fake generated images, fake analytics, fake rankings, fake ad results.

`connected` means a real provider test succeeded. `manual/export-ready` means the owner can copy/use records elsewhere. `rule_based` means deterministic logic. `ai_generated` must only be used when a configured model actually generated output.

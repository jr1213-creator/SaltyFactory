# POD Batch Workflow v1

## Implemented

- `/studio/pod-batches`
- `/studio/pod-batches/new`
- `/studio/pod-batches/:id`
- `GET /api/studio/pod-batches`
- `POST /api/studio/pod-batches`
- `GET /api/studio/pod-batches/:id`
- `POST /api/studio/pod-batches/:id/retry`
- `product_batches`
- `product_batch_items`

Creating a batch persists 15 product draft work items by default. This is not a bulk publish action.

## Stages

```txt
idea
prompt_approved
generation_queued
image_generated
qa_passed
mockup_ready
printify_created
shopify_draft_created
ready_for_publish
published
blocked
failed
```

Per-item failures do not mark the entire batch failed or published. Retry markers are persisted as owner actions and do not execute provider calls by themselves.

# Business Document Ops v1

Status: partial functional v1.

Implemented:
- `/studio/business/documents`
- document draft generation from structured profile data
- owner review/approval
- export manifest records
- sensitive document generation creates authority requests first

Partial:
- Export rows are persisted as internal manifests. Full binary PDF/DOCX rendering is future unless a storage/export provider is configured.

Not implemented:
- Sending documents externally.
- Submitting forms.

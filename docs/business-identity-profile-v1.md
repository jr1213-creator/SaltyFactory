# Business Identity Profile v1

Status: functional v1.

Implemented:
- `/studio/business/profile`
- `GET/PATCH/POST /api/studio/business/profile`
- public business identity fields
- mission, mantra, purpose, goals, brand voice, target customers, products
- EIN stored only as sensitive reference plus masked display value

Sensitive data:
- API responses do not return plaintext EIN or secret refs by default.
- Sensitive use requires authority request.

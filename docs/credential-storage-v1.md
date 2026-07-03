# Credential Storage v1

Status: implemented minimal encrypted credential boundary.

SaltyFactory can store owner-entered provider credentials only when encrypted credential storage is enabled server-side.

## Config

Required server-side deployment variables:

```txt
CREDENTIAL_STORAGE_ENABLED=true
CREDENTIAL_ENCRYPTION_KEY=<32+ character secret>
```

If either value is missing, provider setup routes refuse to store secrets and return a config-blocked response:

```txt
Secure credential storage is not configured. An administrator must enable encrypted credential storage before owner-entered secrets can be saved.
```

## Storage Rules

- Credentials are encrypted server-side with authenticated encryption.
- Credentials are referenced by a credential ref.
- Raw secrets are never returned to the frontend.
- Raw secrets are never logged.
- Raw secrets are never stored in plaintext.
- Secret fields are write-only.
- API responses return only masked display such as `Saved securely`.

## Provider Validation

Provider validation is server-side:

- Printify validates by calling shops discovery.
- Shopify validates by calling the Admin shop endpoint.
- Image generation validates provider/model access.

Responses include:

- `ok`
- `status`
- `safeMessage`
- `setupRequired`
- `nextStep`
- `maskedDisplayValue`
- sanitized provider metadata

Responses must not include provider tokens, API keys, account numbers, EIN, or service-role credentials.

## Administrator Setup Required

Some secrets cannot be safely accepted from a business owner in the browser:

- Supabase service-role key
- private storage credentials
- server encryption key
- deployment database URL

Those remain administrator/server setup only and must be shown as `admin_setup_required` in owner-facing UI.

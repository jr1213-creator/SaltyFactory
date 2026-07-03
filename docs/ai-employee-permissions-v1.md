# AI Employee Permissions v1

Status: functional guardrail model.

Permission levels:
- `read`
- `draft`
- `recommend`
- `write_internal`
- `provider_action_blocked`

Forbidden by default:
- publish, send, spend, sync, delete
- change DNS
- expose secrets
- modify provider credentials
- create live ads
- send email or post social
- publish Shopify or Printify products
- connect bank accounts
- access EIN or full bank account details
- submit applications
- place print orders
- initiate transfers or payments

Provider access remains blocked unless a separate provider route, setup state, owner approval, and route-level guard all permit it.

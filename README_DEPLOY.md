Deploying Supabase functions and testing Stripe webhooks
===============================================

This repository contains helper scripts to deploy the Supabase Edge Functions and test Stripe webhooks locally.

Prerequisites
- `supabase` CLI installed and authenticated
- `stripe` CLI installed and authenticated
- Access to your Supabase project ref and necessary secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`)

Deploy functions (PowerShell)
```powershell
.\scripts\deploy_functions.ps1
```

When prompted, provide your Supabase `project ref` (or set `SUPABASE_PROJECT_REF` environment variable).

Test Stripe webhooks (forward events locally)
```powershell
.\scripts\test_stripe.ps1
```

When prompted, enter the public URL of your deployed webhook (or the local forwarded URL while using `supabase functions serve`). Use `stripe trigger` to send test events.

Recommended test events
```bash
stripe trigger checkout.session.completed
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger checkout.session.async_payment_succeeded
```

Notes
- I cannot perform the deploy from here. Run the PowerShell scripts above on your machine or CI. If you prefer, I can generate a GitHub Actions workflow that deploys on push (you'll still need to set secrets).

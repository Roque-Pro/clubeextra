param(
  [string]$WebhookUrl = $env:WEBHOOK_URL
)

if (-not $WebhookUrl) {
  $WebhookUrl = Read-Host "Enter your deployed webhook URL (https://.../functions/v1/stripe-webhook)"
}

if (-not (Get-Command stripe -ErrorAction SilentlyContinue)) {
  Write-Host "Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
  exit 1
}

Write-Host "Starting stripe listen and forwarding to $WebhookUrl"
Write-Host "(Press Ctrl+C to stop)"
stripe listen --forward-to $WebhookUrl

Write-Host "After starting the listener, in another terminal run the following to trigger test events:"
Write-Host "stripe trigger checkout.session.completed"
Write-Host "stripe trigger invoice.payment_succeeded"
Write-Host "stripe trigger invoice.payment_failed"
Write-Host "stripe trigger checkout.session.async_payment_succeeded"

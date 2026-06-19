param(
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF
)

if (-not $ProjectRef) {
  $ProjectRef = Read-Host "Enter your Supabase project ref (or set SUPABASE_PROJECT_REF)"
}

Write-Host "Checking for supabase CLI..."
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
  Write-Host "supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
  exit 1
}

Write-Host "Deploying functions to project: $ProjectRef"

supabase functions deploy stripe-webhook --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { Write-Error "stripe-webhook deploy failed"; exit 1 }

supabase functions deploy create-stripe-checkout --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { Write-Error "create-stripe-checkout deploy failed"; exit 1 }

Write-Host "Deployment finished."
Write-Host "Reminder: ensure the following secrets/vars are set in your Supabase project:"
Write-Host "- STRIPE_SECRET_KEY"
Write-Host "- SUPABASE_SERVICE_ROLE_KEY"
Write-Host "- SUPABASE_URL"

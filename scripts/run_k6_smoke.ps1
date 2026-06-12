param(
  [string]$BaseUrl = "http://localhost:5000"
)

$ErrorActionPreference = "Stop"
$env:BASE_URL = $BaseUrl

k6 run load-tests/k6/smoke.js


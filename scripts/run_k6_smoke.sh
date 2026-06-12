#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
export BASE_URL

k6 run load-tests/k6/smoke.js


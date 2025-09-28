#!/bin/bash

# Test QR generation endpoint
echo "Testing QR generation endpoint..."

# First get a session cookie by logging in if needed
curl -c cookies.txt -b cookies.txt \
  -X POST \
  "http://localhost:3000/api/stylists/4dda224d-d95b-4dca-a406-c88b5cc87162/app-qr" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
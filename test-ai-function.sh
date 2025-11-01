#!/bin/bash

# Test the Edge Function directly
# Get the anon key from .env or supabase dashboard

SUPABASE_URL="https://koaovonivngxrsezecmg.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYW92b25pdm5nWHJzZXplY21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAyMzYzNzMsImV4cCI6MjA0NTgxMjM3M30.rTj-0WHpBaYiOb9iGXmJ8XEiclJ4Jtf6VVK-MfGWdXg"

curl -i --location --request POST "${SUPABASE_URL}/functions/v1/generate-security-items" \
  --header "Authorization: Bearer ${ANON_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "site_id": "289fc53d-2f8d-43c2-832f-eb0e56da5c68",
    "site_name": "Test Aeropuerto",
    "industry_type": "Aeropuertos",
    "location_type": "transit",
    "location_country": "Mexico",
    "user_id": "7d35cd2b-96ce-40de-94a4-0c0f0fdefd9c"
  }'

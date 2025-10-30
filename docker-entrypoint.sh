#!/bin/sh
set -e

# Reemplazar variables de entorno en los archivos JS compilados
echo "Inyectando variables de entorno en la aplicación..."

# Buscar todos los archivos JS en /usr/share/nginx/html
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i \
  -e "s|https://koaovonivngxrsezecmg.supabase.co|${VITE_SUPABASE_URL}|g" \
  -e "s|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYW92b25pdm5neHJzZXplY21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDc0MjIsImV4cCI6MjA3NzI4MzQyMn0.ZkuETlftItiEKyoVzRBTWOvRJYK0EdAsReFpQ92qmMc|${VITE_SUPABASE_ANON_KEY}|g" \
  -e "s|AIzaSyBo6adrdQowtq7RKgm1deEemX8ej-L9RyM|${VITE_GOOGLE_MAPS_API_KEY}|g" \
  {} +

echo "Variables inyectadas correctamente."

# Iniciar nginx
exec nginx -g "daemon off;"

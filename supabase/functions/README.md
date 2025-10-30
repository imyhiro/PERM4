# Edge Function: generate-security-items

Esta función utiliza OpenAI GPT-4 para generar activos y amenazas de seguridad física personalizados cuando no hay coincidencias en el catálogo global.

## Configuración

### 1. Obtener API Key de OpenAI

1. Ve a https://platform.openai.com/api-keys
2. Crea una cuenta o inicia sesión
3. Click en **"Create new secret key"**
4. Dale un nombre (ej: "Supabase Edge Function")
5. Copia la key (empieza con `sk-...`)

**IMPORTANTE**: Guarda la key inmediatamente, no podrás verla después.

### 2. Configurar variables de entorno en Supabase

```bash
# En tu terminal, ejecuta:
supabase secrets set OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

O desde el Dashboard de Supabase:
1. Ve a **Project Settings** → **Edge Functions** → **Secrets**
2. Agrega: `OPENAI_API_KEY` = `tu-api-key`

### 3. Desplegar la función

```bash
# Asegúrate de estar en el directorio raíz del proyecto
cd /Users/ericgarcia/PERM4B

# Instala Supabase CLI si no lo tienes
# brew install supabase/tap/supabase

# Link al proyecto (primera vez)
supabase link --project-ref tu-project-ref

# Despliega la función
supabase functions deploy generate-security-items

# Verifica que se desplegó correctamente
supabase functions list
```

## Uso

La función se invoca automáticamente desde el frontend cuando:
1. Se crea un sitio con industria personalizada (ej: "Aeropuertos")
2. El catálogo global no tiene coincidencias (0 activos, 0 amenazas)
3. El sistema llama a la función con Claude AI

### Request

```typescript
{
  site_id: string
  site_name: string
  industry_type: string
  location_type: string
  location_country: string
  user_id: string
}
```

### Response

```typescript
{
  success: true,
  assets_added: 18,
  threats_added: 15,
  site_name: "Aeropuerto Internacional",
  industry_type: "Aeropuertos",
  source: "ai_generated"
}
```

## Testing Local

```bash
# Iniciar función localmente
supabase functions serve generate-security-items

# En otra terminal, probar con curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/generate-security-items' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "site_id": "123e4567-e89b-12d3-a456-426614174000",
    "site_name": "Aeropuerto Internacional",
    "industry_type": "Aeropuertos",
    "location_type": "transit",
    "location_country": "Mexico",
    "user_id": "123e4567-e89b-12d3-a456-426614174001"
  }'
```

## Logs y Debugging

```bash
# Ver logs en tiempo real
supabase functions logs generate-security-items --tail

# Ver logs específicos
supabase functions logs generate-security-items --limit 100
```

## Costos estimados (OpenAI GPT-3.5 Turbo)

- **Modelo**: GPT-3.5 Turbo
- **Costo**: ~$0.0005 USD por 1K tokens de entrada, ~$0.0015 USD por 1K tokens de salida
- **Uso por generación**: ~500 tokens entrada + ~1500 tokens salida = ~$0.003 USD
- **Costo por sitio**: ~$0.003 USD (~6 centavos MXN)
- **Velocidad**: ~10-15 segundos por sitio

Para 100 sitios personalizados al mes: ~$0.30 USD (~6 pesos MXN)

**Comparación con GPT-4 Turbo:**
- GPT-4: $0.05/sitio, 30-45 segundos, mayor calidad
- GPT-3.5: $0.003/sitio, 10-15 segundos, buena calidad ✅ (actual)

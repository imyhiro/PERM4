# Configuración de Google Maps API

Para mostrar la previsualización de mapas en las cards de sitios, necesitas obtener una **API Key de Google Maps**.

## 📝 Pasos para obtener tu API Key:

### 1. Crear/Acceder a Google Cloud Console
1. Ve a: https://console.cloud.google.com/
2. Inicia sesión con tu cuenta de Google
3. Si es tu primera vez, acepta los términos de servicio

### 2. Crear un Proyecto (si no tienes uno)
1. Click en el selector de proyecto (arriba a la izquierda)
2. Click en **"Nuevo Proyecto"**
3. Nombre: "PERM4B" o el que prefieras
4. Click **"Crear"**
5. Espera unos segundos y selecciona el proyecto

### 3. Habilitar Google Maps Embed API
1. Ve a: https://console.cloud.google.com/apis/library
2. Busca: **"Maps Embed API"**
3. Click en **"Maps Embed API"**
4. Click en **"Habilitar"** (Enable)
5. Espera unos segundos

### 4. Crear API Key
1. Ve a: https://console.cloud.google.com/google/maps-apis/credentials
2. Click en **"Crear credenciales"** → **"Clave de API"**
3. Se creará tu API Key automáticamente
4. **COPIA LA KEY** (empieza con `AIza...`)

### 5. Restringir la API Key (IMPORTANTE - Seguridad)
1. En la ventana emergente, click en **"Restringir clave"**
2. En "Restricciones de aplicación":
   - Selecciona **"Referentes HTTP (sitios web)"**
   - Agrega estos dominios:
     ```
     localhost:5173/*
     *.vercel.app/*
     tu-dominio.com/*
     ```
3. En "Restricciones de API":
   - Click en **"Restringir clave"**
   - Selecciona solo: **"Maps Embed API"**
4. Click en **"Guardar"**

### 6. Configurar en tu proyecto
1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza `YOUR_API_KEY_HERE` con tu API Key:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyD...tu-key-aqui...
   ```
3. **Guarda el archivo**
4. **Reinicia el servidor de desarrollo** (Ctrl+C y luego `npm run dev`)

## ✅ Verificar que funciona

1. Recarga tu aplicación
2. Ve a la página de **Sitios**
3. Cambia la vista a **"Vista de tarjetas"** (ícono de grid)
4. Deberías ver el mapa embebido en cada card

## 💰 Costos

Google Maps ofrece:
- **$200 USD de crédito gratis cada mes**
- Maps Embed API: Gratis (incluido en el crédito)
- No necesitas tarjeta de crédito inicialmente

**Para este proyecto:**
- Uso estimado: ~100-500 llamadas/mes
- Costo: **$0 USD** (dentro del plan gratuito)

## 🔒 Seguridad

**IMPORTANTE:**
- ✅ SIEMPRE restringe tu API key por dominio
- ✅ NUNCA compartas tu API key públicamente
- ✅ Agrega `.env` a tu `.gitignore` (ya debería estar)

## ❓ Problemas comunes

### "This page can't load Google Maps correctly"
- Verifica que habilitaste "Maps Embed API"
- Verifica que la API key esté correctamente copiada en `.env`
- Reinicia el servidor de desarrollo

### "API key not valid"
- Verifica que copiaste la key completa
- Verifica que no haya espacios extra
- Espera 2-3 minutos si acabas de crear la key

### Mapa no aparece
- Abre la consola del navegador (F12) y busca errores
- Verifica que reiniciaste el servidor después de cambiar `.env`

## 📚 Referencias

- Google Cloud Console: https://console.cloud.google.com/
- Documentación Maps Embed API: https://developers.google.com/maps/documentation/embed/get-started

# Configuración de Variables de Entorno - Supabase Edge Functions

Esta guía te muestra exactamente cómo configurar las variables de entorno para la Edge Function de envío de emails.

## Paso 1: Acceder al Dashboard de Supabase

1. Ve a https://supabase.com/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **sywkskwkexwwdzrbwinp**

## Paso 2: Navegar a Edge Functions

1. En el menú lateral izquierdo, busca la sección **"Edge Functions"**
2. Haz clic en **"Edge Functions"**
3. Verás una lista de funciones (si ya desplegaste alguna) o estará vacía

## Paso 3: Configurar Variables de Entorno

### Opción A: Desde la página de Edge Functions

1. En la página de **Edge Functions**, busca el botón o enlace **"Settings"** o **"Environment Variables"**
2. Haz clic en **"Settings"** o **"Environment Variables"**
3. Verás una sección para agregar variables de entorno

### Opción B: Desde Project Settings (Alternativa)

1. En el menú lateral, haz clic en **"Project Settings"** (icono de engranaje ⚙️)
2. En el submenú, busca **"Edge Functions"** o **"Environment Variables"**
3. Haz clic en esa opción

## Paso 4: Agregar las Variables

Una vez en la sección de variables de entorno, agrega estas tres variables:

### Variable 1: RESEND_API_KEY

1. Haz clic en **"Add new variable"** o **"New variable"**
2. En el campo **"Name"** o **"Key"**, escribe: `RESEND_API_KEY`
3. En el campo **"Value"**, pega tu API key de Resend
4. Haz clic en **"Save"** o **"Add"**

### Variable 2: RESEND_FROM_EMAIL

1. Haz clic en **"Add new variable"** nuevamente
2. En **"Name"**: `RESEND_FROM_EMAIL`
3. En **"Value"**: 
   - Para pruebas: `onboarding@resend.dev`
   - Para producción: `noreply@agenticdream.com` (o tu dominio verificado)
4. Haz clic en **"Save"**

### Variable 3: APP_URL

1. Haz clic en **"Add new variable"** nuevamente
2. En **"Name"**: `APP_URL`
3. En **"Value"**: `https://carloscedeno-creator.github.io/delivery-dashboard`
4. Haz clic en **"Save"**

## Paso 5: Verificar las Variables

Deberías ver una lista con estas tres variables:

```
✅ RESEND_API_KEY        [••••••••]
✅ RESEND_FROM_EMAIL     onboarding@resend.dev
✅ APP_URL               https://carloscedeno-creator.github.io/delivery-dashboard
```

## Paso 6: Obtener API Key de Resend (si aún no la tienes)

1. Ve a https://resend.com
2. Inicia sesión o crea una cuenta (gratis)
3. Ve a **"API Keys"** en el menú
4. Haz clic en **"Create API Key"**
5. Dale un nombre (ej: "Strata Dashboard")
6. Copia la clave (solo se muestra una vez)
7. Pégalo en la variable `RESEND_API_KEY` en Supabase

## Notas Importantes

- ⚠️ Las variables son **sensibles** - no las compartas públicamente
- ⚠️ Después de agregar/modificar variables, **redespliega la función** para que tome los cambios
- ✅ Puedes editar las variables en cualquier momento
- ✅ Los valores están enmascarados por seguridad (se muestran como `••••`)

## Verificación Rápida

Para verificar que las variables están configuradas:

1. Ve a **Edge Functions** > **Settings**
2. Deberías ver las 3 variables listadas
3. Si no las ves, intenta refrescar la página

## Troubleshooting

### No encuentro la opción "Settings"

- Asegúrate de estar en el proyecto correcto
- Busca en **Project Settings** > **Edge Functions**
- Algunas veces está en **Project Settings** > **API** > **Edge Functions**

### Las variables no se aplican

- Asegúrate de **redesplegar la función** después de agregar variables
- Las variables se aplican solo a funciones desplegadas
- Espera unos segundos después de guardar

### Necesito ayuda visual

Si no encuentras la opción, puedes:
1. Buscar en la barra de búsqueda del dashboard: "environment variables"
2. O ir directamente a: `https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions`

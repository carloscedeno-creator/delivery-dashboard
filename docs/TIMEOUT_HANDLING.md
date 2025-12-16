# ⏱️ Manejo de Timeouts en Sincronización Notion

## 🔍 Problema: Timeouts en Peticiones HTTP

Cuando las peticiones HTTP tardan mucho tiempo o no responden, pueden quedarse "colgadas" indefinidamente, bloqueando el proceso de sincronización.

## ✅ Solución Implementada

Se agregó manejo de timeouts usando `AbortController` en todas las peticiones HTTP:

### 1. Timeout en Búsqueda de Notion

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

const response = await fetch(NOTION_PROXY_URL, {
  // ... configuración
  signal: controller.signal
});

clearTimeout(timeoutId);
```

**Comportamiento:**
- ⏱️ Timeout: 30 segundos
- ❌ Si excede: Se cancela la petición y retorna array vacío
- ✅ Si completa: Continúa normalmente

### 2. Timeout en Obtención de CSV

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos

const response = await fetch(csvUrl, {
  signal: controller.signal
});
```

**Comportamiento:**
- ⏱️ Timeout: 30 segundos
- ❌ Si excede: Lanza error y detiene la sincronización
- ✅ Si completa: Continúa normalmente

## 📊 Qué Pasa Cuando Hay Timeout

### Escenario 1: Timeout en Búsqueda de Notion

**Comportamiento:**
1. La petición se cancela después de 30 segundos
2. Se registra un error: `[NOTION] Timeout searching for "Nombre" (30s timeout exceeded)`
3. Retorna array vacío `[]`
4. La iniciativa se marca como `not_found` en el resumen
5. **La sincronización continúa** con las siguientes iniciativas

**Ejemplo de salida:**
```
📊 Processing: AI Acknowledgement
------------------------------------------------------------
[NOTION] Timeout searching for "AI Acknowledgement" (30s timeout exceeded)
   ⚠️  No Notion pages found
```

### Escenario 2: Timeout en Obtención de CSV

**Comportamiento:**
1. La petición se cancela después de 30 segundos
2. Se lanza un error: `Timeout fetching CSV (30s timeout exceeded)`
3. **La sincronización se detiene completamente**
4. Se muestra error fatal en el resumen

**Ejemplo de salida:**
```
📊 Fetching initiatives from Product CSV...
❌ Fatal error: Timeout fetching CSV (30s timeout exceeded)
```

## ⚙️ Configuración de Timeouts

### Timeout Actual: 30 segundos

Este valor es razonable para:
- ✅ Búsquedas en Notion (pueden tardar 5-15 segundos)
- ✅ Descarga de CSV (normalmente < 5 segundos)
- ✅ Edge Functions de Supabase (timeout típico: 60s)

### Ajustar Timeout

Si necesitas cambiar el timeout, edita en `scripts/sync-notion-initiatives.js`:

```javascript
// Para búsqueda de Notion (línea ~107)
const timeoutId = setTimeout(() => controller.abort(), 30000); // Cambiar 30000 (30s)

// Para CSV (línea ~35)
const timeoutId = setTimeout(() => controller.abort(), 30000); // Cambiar 30000 (30s)
```

**Valores recomendados:**
- `10000` = 10 segundos (más rápido, más riesgo de timeout)
- `30000` = 30 segundos (actual, balanceado)
- `60000` = 60 segundos (más lento, menos riesgo de timeout)

## 🐛 Troubleshooting de Timeouts

### Problema: Muchos timeouts en búsquedas de Notion

**Posibles causas:**
1. Edge Function de Supabase muy lenta
2. Notion API lenta o sobrecargada
3. Problemas de red

**Soluciones:**
1. Aumentar timeout a 60 segundos
2. Verificar estado de Supabase Edge Functions
3. Verificar estado de Notion API
4. Revisar logs de la Edge Function en Supabase

### Problema: Timeout en CSV

**Posibles causas:**
1. Proxy de Google Sheets lento
2. CSV muy grande
3. Problemas de red

**Soluciones:**
1. Aumentar timeout a 60 segundos
2. Verificar que el proxy esté funcionando
3. Revisar tamaño del CSV

## 📈 Monitoreo de Timeouts

### Ver timeouts en logs

Los timeouts se registran con el prefijo `[NOTION] Timeout`:

```bash
npm run sync:notion 2>&1 | grep -i timeout
```

### Estadísticas de timeouts

En el resumen final, las iniciativas con timeout aparecen como:
```
❌ Failed initiatives:
   - AI Acknowledgement: not_found (timeout)
```

## 🔄 Recuperación Automática

El sistema tiene recuperación automática:

1. **Timeouts en búsquedas individuales:**
   - No detienen la sincronización
   - Se registran como "not_found"
   - Continúa con la siguiente iniciativa

2. **Timeouts en CSV:**
   - Detienen toda la sincronización
   - Requieren reintento manual

## 💡 Mejoras Futuras

Posibles mejoras:
- [ ] Reintentos automáticos en caso de timeout
- [ ] Timeout configurable por variable de entorno
- [ ] Métricas de tiempo de respuesta por iniciativa
- [ ] Alertas cuando hay muchos timeouts

---

**Los timeouts previenen que el proceso se quede colgado indefinidamente.**

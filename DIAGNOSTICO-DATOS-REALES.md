# 🔍 Diagnóstico: ¿Por qué no se cargan los datos reales?

## 📋 Pasos para Diagnosticar

### 1. Abre la Consola del Navegador
- Presiona **F12** o **Ctrl+Shift+I**
- Ve a la pestaña **Console**

### 2. Ejecuta el Script de Diagnóstico
- Abre el archivo: `tests/diagnose-product-data.js`
- Copia TODO el contenido
- Pégalo en la consola del navegador
- Presiona Enter

### 3. Revisa los Resultados

El script te dirá:
- ✅ Si las URLs de Google Sheets son correctas
- ✅ Si el CORS proxy está funcionando
- ✅ Si hay datos reales en las hojas
- ✅ Por qué está usando datos mock

## 🐛 Problemas Comunes

### Problema 1: CORS Proxy no responde
**Síntoma**: Timeout o "connection refused"

**Solución**:
- Verifica que el proxy esté activo: `https://sheets-proxy.carlos-cedeno.workers.dev/`
- Si no funciona, necesitas actualizar la URL del proxy en `index.html`

### Problema 2: URLs de Google Sheets incorrectas
**Síntoma**: Error 404 o datos vacíos

**Solución**:
1. Verifica que las hojas de Google Sheets estén publicadas (compartidas como público)
2. Verifica que los gids sean correctos:
   - Initiatives: `gid=933125518`
   - Bug Release: `gid=1707343419`

### Problema 3: Formato de CSV incorrecto
**Síntoma**: Se parsean datos pero están vacíos o mal formateados

**Solución**:
- Verifica que las columnas en Google Sheets coincidan con:
  - Initiatives: Initiative, BA, Designer, Team, Quarter, Status, Effort (days), Completion (%)
  - Bug Release: Type, Priority, Release, Initiative, Status

## 🔧 Verificación Manual de URLs

### URL de Initiatives:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv
```

### URL de Bug Release:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=1707343419&single=true&output=csv
```

**Abre estas URLs directamente en el navegador** para verificar que:
1. Las hojas existan
2. Tengan datos
3. Estén publicadas correctamente

## 📊 Logs en Consola

Cuando el dashboard carga, deberías ver en la consola:

```
[PRODUCT] Loading data from Google Sheets...
[PRODUCT] Fetching initiatives from: ...
[PRODUCT] Successfully fetched initiatives, length: ...
```

Si ves:
```
[PRODUCT] Connection error, using mock data: ...
```

Significa que falló la conexión y está usando datos mock.

## ✅ Solución Rápida

Si quieres **forzar datos mock temporalmente** para desarrollo:

1. Abre `index.html`
2. Busca `ProductRoadmapData.load`
3. Comenta la carga real y usa mock directamente:

```javascript
// Temporalmente forzar mock data
return {
    initiatives: ProductRoadmapData.MOCK_DATA.initiatives,
    bugRelease: ProductRoadmapData.MOCK_DATA.bugRelease
};
```

## 🆘 Si Nada Funciona

1. Verifica la consola del navegador (F12) para ver errores específicos
2. Verifica la pestaña Network para ver qué requests están fallando
3. Ejecuta el script de diagnóstico
4. Verifica que las hojas de Google Sheets estén publicadas correctamente


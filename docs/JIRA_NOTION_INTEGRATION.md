# Integración con Jira y Notion - Resumen Ejecutivo

## 🎯 Objetivo

Integrar Jira y Notion para obtener métricas de completación más precisas y realistas, resolviendo el problema identificado donde RPC Core mostraba 95% de completación pero solo calculaba tareas existentes, no el alcance total del proyecto.

## ✅ Lo que se ha implementado

### 1. Configuración de APIs
- ✅ `src/config/jiraConfig.js` - Configuración de Jira
- ✅ `src/config/notionConfig.js` - Configuración de Notion
- ✅ Soporte para variables de entorno
- ✅ Mapeo de estados y campos personalizados

### 2. Utilidades de API
- ✅ `src/utils/jiraApi.js` - Funciones para obtener datos de Jira
  - Obtener issues de epics
  - Obtener issues de proyectos
  - Buscar issues por JQL
  - Calcular métricas basadas en issues
- ✅ `src/utils/notionApi.js` - Funciones para obtener datos de Notion
  - Obtener páginas de base de datos
  - Buscar páginas por iniciativa
  - Calcular métricas basadas en páginas

### 3. Servicio Unificado
- ✅ `src/utils/metricsService.js` - Combina métricas de múltiples fuentes
  - Intenta obtener métricas de Jira primero
  - Si no hay Jira, intenta Notion
  - Combina con datos de Google Sheets
  - Detecta automáticamente métricas engañosas

### 4. Backend/Proxy
- ✅ `cloudflare-worker-jira-notion.js` - Worker actualizado
  - Maneja autenticación de Jira
  - Maneja autenticación de Notion
  - Mantiene credenciales seguras en el backend
  - Cache de 5 minutos

### 5. Documentación
- ✅ `docs/INTEGRATION_SETUP.md` - Guía completa de configuración
- ✅ `.env.example` - Ejemplo de variables de entorno

## 🚀 Próximos Pasos

### Para Activar la Integración:

1. **Configurar Cloudflare Worker**
   - Actualizar el worker con el código de `cloudflare-worker-jira-notion.js`
   - Agregar variables de entorno (ver `docs/INTEGRATION_SETUP.md`)

2. **Configurar Jira** (Opcional pero recomendado)
   - Crear API Token
   - Obtener Base URL y Project Key
   - Identificar campos personalizados (Epic Link, Story Points)

3. **Configurar Notion** (Opcional)
   - Crear integración
   - Compartir base de datos
   - Obtener Database ID

4. **Integrar en el Código**
   - El código ya está preparado para usar las métricas
   - Solo necesitas importar y usar `getCombinedMetrics` en `StrataMappingView`

## 📊 Beneficios

1. **Métricas Más Precisas**: Basadas en tareas reales de Jira/Notion, no solo en tareas existentes
2. **Detección Automática**: Identifica cuando un porcentaje puede ser engañoso
3. **Múltiples Fuentes**: Combina datos de Google Sheets, Jira y Notion
4. **Seguridad**: Credenciales mantenidas en el backend, nunca expuestas al frontend
5. **Flexibilidad**: Funciona con o sin Jira/Notion (fallback a Google Sheets)

## 🔄 Flujo de Datos

```
Google Sheets (Datos base)
    ↓
StrataMappingView
    ↓
metricsService.getCombinedMetrics()
    ↓
    ├─→ Jira API (si está configurado)
    │   └─→ Calcula métricas realistas
    │
    └─→ Notion API (si Jira no está disponible)
        └─→ Calcula métricas realistas
    ↓
Combina métricas y detecta si son engañosas
    ↓
Muestra en la UI con advertencias si es necesario
```

## 💡 Ejemplo de Uso

```javascript
import { getCombinedMetrics } from './utils/metricsService';

// En StrataMappingView, al obtener iniciativas:
const enhancedInitiatives = await Promise.all(
    allInitiatives.map(async (initiative) => {
        const metrics = await getCombinedMetrics(initiative, {
            useJira: true,
            useNotion: true,
            jiraProjectKey: 'PROJ'
        });
        
        return {
            ...initiative,
            realisticCompletion: metrics.realisticCompletion,
            mightBeMisleading: metrics.mightBeMisleading,
            source: metrics.source
        };
    })
);
```

## ⚠️ Notas Importantes

1. **Credenciales**: Nunca expongas credenciales en el código del frontend
2. **Cache**: Las métricas se cachean por 5 minutos para mejorar rendimiento
3. **Nombres**: Los nombres de iniciativas deben coincidir entre Google Sheets y Jira/Notion
4. **Campos Personalizados**: Los IDs de campos personalizados de Jira pueden variar según tu instancia

## 📞 Soporte

Para más detalles, consulta:
- `docs/INTEGRATION_SETUP.md` - Guía completa de configuración
- Código fuente en `src/utils/metricsService.js` - Ejemplos de uso


# Guía de Integración con Jira y Notion

Esta guía explica cómo configurar las integraciones con Jira y Notion para obtener métricas más precisas de completación de proyectos.

## 📋 Tabla de Contenidos

1. [Configuración de Jira](#configuración-de-jira)
2. [Configuración de Notion](#configuración-de-notion)
3. [Configuración del Cloudflare Worker](#configuración-del-cloudflare-worker)
4. [Uso en la Aplicación](#uso-en-la-aplicación)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 Configuración de Jira

### Paso 1: Crear API Token

1. Ve a [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Haz clic en "Create API token"
3. Dale un nombre descriptivo (ej: "Delivery Dashboard")
4. Copia el token generado (solo se muestra una vez)

### Paso 2: Obtener Información de tu Instancia

- **Base URL**: Tu dominio de Jira (ej: `https://tu-empresa.atlassian.net`)
- **Email**: El email asociado a tu cuenta de Atlassian
- **Project Key**: La clave de tu proyecto (ej: `PROJ`, `DEV`)

### Paso 3: Configurar Variables de Entorno

En tu Cloudflare Worker, agrega estas variables de entorno:

```
JIRA_BASE_URL_ENV=https://tu-empresa.atlassian.net
JIRA_EMAIL_ENV=tu-email@empresa.com
JIRA_API_TOKEN_ENV=tu-api-token-aqui
```

### Paso 4: Identificar Campos Personalizados

Los campos personalizados pueden variar según tu configuración de Jira. Para encontrar los IDs:

1. Ve a un issue en Jira
2. Abre las herramientas de desarrollador (F12)
3. Busca el campo en el HTML o usa la API:
   ```bash
   curl -u email:token https://tu-empresa.atlassian.net/rest/api/3/field
   ```

Campos comunes:
- **Epic Link**: `customfield_10011` (puede variar)
- **Story Points**: `customfield_10016` (puede variar)
- **Sprint**: `customfield_10020` (puede variar)

Actualiza estos valores en `src/config/jiraConfig.js` si son diferentes.

---

## 📝 Configuración de Notion

### Paso 1: Crear Integración

1. Ve a [Notion Integrations](https://www.notion.so/my-integrations)
2. Haz clic en "+ New integration"
3. Dale un nombre (ej: "Delivery Dashboard")
4. Selecciona tu workspace
5. Copia el "Internal Integration Token"

### Paso 2: Compartir Base de Datos

1. Abre tu base de datos en Notion
2. Haz clic en "..." (tres puntos) en la esquina superior derecha
3. Selecciona "Add connections"
4. Busca y selecciona tu integración

### Paso 3: Obtener Database ID

1. Abre tu base de datos en Notion
2. Copia la URL
3. El ID está en la URL: `https://www.notion.so/workspace/DATABASE_ID?v=...`
   - El ID es la parte entre `/workspace/` y `?v=`
   - Si tiene guiones, quítalos (Notion los agrega para formato)

### Paso 4: Configurar Variables de Entorno

En tu Cloudflare Worker:

```
NOTION_API_TOKEN_ENV=secret_xxxxxxxxxxxxx
NOTION_DATABASE_ID_ENV=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Paso 5: Mapear Propiedades

Asegúrate de que tu base de datos de Notion tenga estas propiedades (o actualiza `src/config/notionConfig.js`):

- **Initiative** (Title o Text): Nombre de la iniciativa
- **Status** (Select): Estado (Not Started, In Progress, Done, etc.)
- **Completion** (Number): Porcentaje de completación (0-100)
- **Assignee** (Person): Persona asignada
- **Due Date** (Date): Fecha de entrega
- **Epic** (Relation o Text): Epic relacionado
- **Story Points** (Number): Story points
- **Tags** (Multi-select): Tags o categorías
- **Comments** (Text): Comentarios o notas

---

## ☁️ Configuración del Cloudflare Worker

### Opción 1: Actualizar Worker Existente

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Selecciona tu Worker (`sheets-proxy`)
3. Ve a "Settings" > "Variables"
4. Agrega las variables de entorno mencionadas arriba
5. Reemplaza el código con `cloudflare-worker-jira-notion.js`

### Opción 2: Crear Nuevo Worker

1. Crea un nuevo Worker en Cloudflare
2. Copia el código de `cloudflare-worker-jira-notion.js`
3. Configura las variables de entorno
4. Actualiza las URLs en `src/config/jiraConfig.js` y `src/config/notionConfig.js`

---

## 💻 Uso en la Aplicación

### Integración Básica

El servicio de métricas se integra automáticamente con el código existente. Para usarlo manualmente:

```javascript
import { getCombinedMetrics } from './utils/metricsService';

// Obtener métricas para una iniciativa
const initiative = {
    initiative: 'RPC CORE',
    status: 95,
    squad: 'Core Infrastructure'
};

const metrics = await getCombinedMetrics(initiative, {
    useJira: true,
    useNotion: true,
    jiraProjectKey: 'PROJ' // Opcional
});

console.log(metrics);
// {
//   initiative: 'RPC CORE',
//   currentCompletion: 95,
//   realisticCompletion: 45, // Basado en Jira/Notion
//   mightBeMisleading: true,
//   jiraMetrics: { ... },
//   notionMetrics: null,
//   source: 'jira'
// }
```

### Integración con StrataMappingView

El código ya está preparado para usar métricas realistas. Solo necesitas:

1. Configurar las credenciales en el Cloudflare Worker
2. Asegurarte de que los nombres de iniciativas coincidan entre Google Sheets y Jira/Notion
3. Las métricas se calcularán automáticamente

---

## 🔍 Troubleshooting

### Error: "Jira credentials not configured"

- Verifica que las variables de entorno estén configuradas en el Cloudflare Worker
- Asegúrate de que los nombres de las variables sean exactos: `JIRA_BASE_URL_ENV`, `JIRA_EMAIL_ENV`, `JIRA_API_TOKEN_ENV`

### Error: "Notion API token not configured"

- Verifica que `NOTION_API_TOKEN_ENV` esté configurado
- Asegúrate de que la base de datos esté compartida con la integración

### No se encuentran issues en Jira

- Verifica que el nombre de la iniciativa en Google Sheets coincida con el summary o description en Jira
- Ajusta la query JQL en `src/utils/jiraApi.js` si necesitas búsquedas más específicas
- Verifica que tengas permisos para ver los issues

### No se encuentran páginas en Notion

- Verifica que la propiedad "Initiative" exista en tu base de datos
- Asegúrate de que los nombres coincidan exactamente
- Verifica que la base de datos esté compartida con la integración

### Métricas no se actualizan

- El cache es de 5 minutos. Espera o limpia el cache
- Verifica que las APIs estén respondiendo correctamente
- Revisa la consola del navegador para errores

---

## 📚 Recursos Adicionales

- [Jira REST API Documentation](https://developer.atlassian.com/cloud/jira/platform/rest/v3/)
- [Notion API Documentation](https://developers.notion.com/reference)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

---

## 🔒 Seguridad

**IMPORTANTE**: Nunca expongas tus credenciales en el código del frontend. Todas las credenciales deben estar:

1. ✅ En variables de entorno del Cloudflare Worker
2. ✅ Nunca en el código fuente del frontend
3. ✅ Nunca en commits de Git

Si accidentalmente expusiste credenciales:
1. Revoca inmediatamente los tokens/API keys
2. Genera nuevos tokens
3. Actualiza las variables de entorno


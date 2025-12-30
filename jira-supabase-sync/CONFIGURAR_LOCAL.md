# 🔧 Configurar PROJECTS_CONFIG Localmente

## 📋 Tu Configuración Actual

Tienes 4 proyectos configurados:

### goavanto.atlassian.net:
- **OBD** - Orderbahn
- **ODSO** - Core-Infrastructure

### agiledreamteam.atlassian.net:
- **IN** - Integration
- **APM** - Product Board

## ⚠️ Importante

En tu JSON actual, los proyectos de `goavanto.atlassian.net` tienen `"jiraApiToken": "TOKEN_GOAVANTO"` que es un placeholder.

**Necesitas reemplazarlo con tu token real de goavanto.**

## 🚀 Pasos para Configurar Localmente

### Opción 1: Agregar al .env (Recomendado)

1. Abre tu archivo `.env` en la raíz de `delivery-dashboard`

2. Agrega esta línea (reemplaza `TOKEN_GOAVANTO` con tu token real):

```env
PROJECTS_CONFIG=[{"projectKey":"OBD","projectName":"Orderbahn","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TU_TOKEN_GOAVANTO_AQUI"},{"projectKey":"ODSO","projectName":"Core-Infrastructure","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TU_TOKEN_GOAVANTO_AQUI"},{"projectKey":"IN","projectName":"Integration","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TU_TOKEN_AGILEDREAMTEAM_AQUI"},{"projectKey":"APM","projectName":"Product Board","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TU_TOKEN_AGILEDREAMTEAM_AQUI"}]
```

**⚠️ IMPORTANTE:** El JSON debe estar en una sola línea sin saltos de línea.

### Opción 2: Usar el archivo JSON

1. Edita `PROJECTS_CONFIG_LOCAL.json` y reemplaza `TOKEN_GOAVANTO` con tu token real

2. Luego, en tu `.env`, agrega:

```env
PROJECTS_CONFIG=$(cat jira-supabase-sync/PROJECTS_CONFIG_LOCAL.json | tr -d '\n')
```

O simplemente copia el contenido del JSON (sin saltos de línea) y pégalo en `PROJECTS_CONFIG`.

## ✅ Verificar Configuración

Después de configurar, ejecuta:

```powershell
cd jira-supabase-sync
npm run verify-config
```

Deberías ver:
- ✅ 4 proyectos configurados
- ✅ Conexión a Supabase: OK
- ✅ Conexión a Jira para cada proyecto: OK

## 🔑 Obtener Token de Goavanto

Si no tienes el token de goavanto:

1. Ve a: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en "Create API token"
3. Dale un nombre (ej: "Jira Sync - Goavanto")
4. Copia el token generado
5. Reemplaza `TOKEN_GOAVANTO` en tu configuración

## 📝 Nota sobre GitHub Secrets

El JSON que tienes en GitHub Secrets está correcto, solo necesitas:
1. Reemplazar `TOKEN_GOAVANTO` con el token real
2. Actualizar el secret en GitHub





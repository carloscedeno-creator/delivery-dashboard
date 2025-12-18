# 📋 Configuración de PROJECTS_CONFIG - Paso a Paso

## 🎯 JSON Correcto para GitHub Secrets

Copia este JSON y reemplaza los tokens placeholder con tus tokens reales:

```json
[{"projectKey":"OBD","projectName":"Orderbahn","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"ODSO","projectName":"Core-Infrastructure","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"IN","projectName":"Integration","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"},{"projectKey":"APM","projectName":"Product Board","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"}]
```

## ⚠️ IMPORTANTE: Reemplazar Tokens

**Antes de guardar en GitHub Secrets**, reemplaza:

1. `TOKEN_GOAVANTO` → Tu token real de API para `goavanto.atlassian.net`
   - Este token se usa para proyectos: **OBD** y **ODSO**
   - Debe tener permisos de lectura en ambos proyectos

2. `TOKEN_AGILEDREAMTEAM` → Tu token real de API para `agiledreamteam.atlassian.net`
   - Este token se usa para proyectos: **IN** y **APM**
   - Debe tener permisos de lectura en ambos proyectos

## 📝 Pasos para Configurar en GitHub

1. **Preparar el JSON:**
   - Copia el JSON de arriba
   - Reemplaza `TOKEN_GOAVANTO` con tu token real de goavanto
   - Reemplaza `TOKEN_AGILEDREAMTEAM` con tu token real de agiledreamteam
   - **NO agregues espacios ni saltos de línea** - debe ser una sola línea

2. **Ir a GitHub:**
   - Ve a tu repositorio: `https://github.com/[tu-usuario]/delivery-dashboard`
   - Click en **Settings** (Configuración)
   - En el menú lateral, click en **Secrets and variables** → **Actions**

3. **Crear/Editar el Secret:**
   - Si ya existe `PROJECTS_CONFIG`, click en **Update** (Actualizar)
   - Si no existe, click en **New repository secret** (Nuevo secreto)
   - **Name**: `PROJECTS_CONFIG`
   - **Secret**: Pega el JSON minificado completo (una sola línea)
   - Click en **Add secret** o **Update secret**

4. **Verificar:**
   ```bash
   cd jira-supabase-sync
   npm run verify-config
   ```

## 🔍 Verificar que Funciona

Después de configurar, ejecuta el sincronizador:

```bash
cd jira-supabase-sync
npm run sync
```

Deberías ver:
```
📋 Proyectos a sincronizar: 4
   - OBD (goavanto.atlassian.net)
   - ODSO (goavanto.atlassian.net)
   - IN (agiledreamteam.atlassian.net)
   - APM (agiledreamteam.atlassian.net)
```

## ❌ Errores Comunes

1. **"PROJECTS_CONFIG debe ser un array"**
   - ✅ Asegúrate de que el JSON empiece con `[` y termine con `]`
   - ❌ NO: `{"projectKey":"OBD",...}`
   - ✅ SÍ: `[{"projectKey":"OBD",...}]`

2. **"SyntaxError: Unexpected token"**
   - ✅ Asegúrate de que no haya comentarios `//` o `/* */`
   - ✅ Asegúrate de que todas las comas estén correctas
   - ✅ Usa un validador JSON online: https://jsonlint.com/

3. **"Issue does not exist or you do not have permission"**
   - ✅ Verifica que el token tenga permisos de lectura en el proyecto
   - ✅ Verifica que el `projectKey` sea correcto (mayúsculas/minúsculas importan)
   - ✅ Verifica que el `jiraDomain` sea correcto

## 📌 Notas

- Los tokens pueden ser los mismos para proyectos del mismo dominio
- El JSON debe estar en una sola línea (minificado) para GitHub Secrets
- No uses comillas simples, solo comillas dobles `"`
- No agregues espacios después de las comas (opcional pero recomendado)

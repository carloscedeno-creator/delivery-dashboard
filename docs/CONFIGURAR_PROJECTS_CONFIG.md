# Configuración de PROJECTS_CONFIG

## Formato Correcto del JSON

El `PROJECTS_CONFIG` debe ser un **array JSON válido** con la siguiente estructura:

```json
[
  {
    "projectKey": "OBD",
    "projectName": "Orderbahn",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_AQUI"
  },
  {
    "projectKey": "ODSO",
    "projectName": "Core-Infrastructure",
    "jiraDomain": "goavanto.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_AQUI"
  },
  {
    "projectKey": "IN",
    "projectName": "Integration",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_AQUI"
  },
  {
    "projectKey": "APM",
    "projectName": "Product Board",
    "jiraDomain": "agiledreamteam.atlassian.net",
    "jiraEmail": "carlos.cedeno@agenticdream.com",
    "jiraApiToken": "TU_TOKEN_AQUI"
  }
]
```

## Pasos para Configurar en GitHub Secrets

1. **Preparar el JSON:**
   - Copia el JSON de arriba
   - Reemplaza `TU_TOKEN_AQUI` con los tokens reales de cada proyecto
   - **IMPORTANTE**: Para proyectos del mismo dominio, usa el mismo token:
     - `goavanto.atlassian.net` → Usa el mismo token para OBD y ODSO
     - `agiledreamteam.atlassian.net` → Usa el mismo token para IN y APM

2. **Minificar el JSON (opcional pero recomendado):**
   - Elimina todos los espacios y saltos de línea
   - O usa un minificador online: https://jsonformatter.org/json-minify
   - Ejemplo minificado:
   ```json
   [{"projectKey":"OBD","projectName":"Orderbahn","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"ODSO","projectName":"Core-Infrastructure","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"IN","projectName":"Integration","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"},{"projectKey":"APM","projectName":"Product Board","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"}]
   ```

3. **Agregar a GitHub Secrets:**
   - Ve a tu repositorio en GitHub
   - Settings → Secrets and variables → Actions
   - Crea o edita el secret `PROJECTS_CONFIG`
   - Pega el JSON minificado completo en el valor
   - Guarda

4. **Verificar localmente (opcional):**
   ```bash
   cd jira-supabase-sync
   npm run verify-config
   ```

## Notas Importantes

- ✅ El JSON debe ser un **array** (empezar con `[` y terminar con `]`)
- ✅ Cada proyecto debe tener comas entre ellos (excepto el último)
- ✅ No uses comentarios `//` o `/* */` en el JSON
- ✅ Los tokens deben tener permisos de lectura en sus respectivos proyectos
- ✅ Para proyectos del mismo dominio, puedes usar el mismo token

## Verificar que Funciona

Después de configurar, ejecuta:

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


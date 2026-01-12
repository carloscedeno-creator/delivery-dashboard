# Configuration Guidelines

**Última actualización:** 2024-12-19

---

## 🔐 Variables de Entorno

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

### Sync Service (.env)
```env
JIRA_URL=https://tu-instancia.atlassian.net
JIRA_EMAIL=tu-email@example.com
JIRA_API_TOKEN=tu-api-token
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## 📁 Configuración de Proyectos

### PROJECTS_CONFIG.json
- **Ubicación:** `jira-supabase-sync/PROJECTS_CONFIG_LOCAL.json`
- **Formato:** Ver `jira-supabase-sync/PROJECTS_CONFIG_FORMAT.json`
- **Propósito:** Configurar múltiples proyectos Jira para sync

### Estructura
```json
{
  "projects": [
    {
      "projectKey": "OBD",
      "squadId": "uuid-del-squad",
      "jiraConfig": {
        "url": "...",
        "email": "...",
        "apiToken": "..."
      }
    }
  ]
}
```

---

## 🛠️ Setup Local

### Prerrequisitos
- Node.js 16+
- npm o yarn
- Git

### Instalación
```bash
npm install
```

### Desarrollo
```bash
npm run dev
# Abre http://localhost:5173
```

### Build
```bash
npm run build
npm run preview
```

---

## 🔧 Configuración de Vite

### Base Path
- **Desarrollo:** `/` (raíz)
- **Producción:** `/delivery-dashboard/` (GitHub Pages)

### Path Aliases
- `@/` → `src/`
- **Siempre usar** alias `@/` en lugar de imports relativos

---

## 📊 Configuración de Permisos

### Roles
- **Admin:** Acceso completo
- **PM:** Delivery, Product, Projects Metrics
- **Developer:** Developer Metrics, Team Capacity
- **Viewer:** Solo lectura

### Archivo
- `src/config/permissions.js`
- Ver: `src/components/RoleAccess.jsx`

---

## 🔗 Referencias

- Configuración Env: `docs/CONFIGURACION_ENV.md`
- Projects Config: `docs/CONFIGURAR_PROJECTS_CONFIG.md`
- Permisos: `src/config/permissions.js`

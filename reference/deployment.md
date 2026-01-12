# Deployment Guidelines

**Última actualización:** 2024-12-19

---

## 🚀 Frontend Deployment

### GitHub Pages

#### Setup
1. **Build:** `npm run build`
2. **Deploy:** `npm run deploy` (usa gh-pages)
3. **Base Path:** `/delivery-dashboard/` (configurado en `vite.config.js`)

#### Variables de Entorno
- Configurar en GitHub Secrets o usar valores por defecto
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

#### Workflow
- Build automático en push a main
- Ver: `.github/workflows/` (si existe)

---

## 🔄 Sync Service Deployment

### Opciones

#### Vercel (Recomendado - Gratis)
- Deploy automático desde GitHub
- Cron job cada 30 minutos
- Ver: `jira-supabase-sync/README.md`

#### Railway ($5/mes)
- Deploy automático
- Cron job configurado

#### Render (Gratis)
- Deploy automático
- Cron job configurado

---

## 🗄️ Database (Supabase)

### Migraciones
1. Abrir Supabase SQL Editor
2. Ejecutar migraciones en orden:
   - `create_status_definitions_table.sql`
   - `create_sprint_scope_changes_table.sql`
   - `update_calculate_sp_done_function.sql`

### Edge Functions
- Ver: `docs/SUPABASE_EDGE_FUNCTIONS_SETUP.md`
- Deploy manual desde Supabase Dashboard

---

## ⚙️ Configuración

### Variables de Entorno

#### Frontend (.env)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

#### Sync Service (.env)
```env
JIRA_URL=https://tu-instancia.atlassian.net
JIRA_EMAIL=tu-email@example.com
JIRA_API_TOKEN=tu-token
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

---

## ✅ Checklist de Deploy

### Frontend
- [ ] Variables de entorno configuradas
- [ ] Build exitoso (`npm run build`)
- [ ] Deploy a GitHub Pages
- [ ] Verificar que carga correctamente

### Sync Service
- [ ] Variables de entorno configuradas
- [ ] Deploy a Vercel/Railway/Render
- [ ] Cron job configurado (cada 30 min)
- [ ] Verificar que sync funciona

### Database
- [ ] Migraciones aplicadas
- [ ] Funciones RPC funcionando
- [ ] Triggers automáticos activos

---

## 🔗 Referencias

- GitHub Pages: `docs/GITHUB_PAGES_DEPLOYMENT.md`
- Sync Service: `jira-supabase-sync/README.md`
- Supabase Setup: `docs/SUPABASE_SETUP.md`

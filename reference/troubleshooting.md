# Troubleshooting Guide

**Última actualización:** 2024-12-19

---

## 🐛 Errores Comunes

### Error: "Failed to resolve import react-router-dom"

**Causa:** Import innecesario de react-router-dom  
**Solución:** Remover import si no se usa routing  
**Prevención:** Verificar imports antes de commit  
**Ver:** `docs/TROUBLESHOOTING_LOCAL_DEVELOPMENT.md`

### Error: "column reference is ambiguous"

**Causa:** SQL con columnas ambiguas (múltiples tablas con mismo nombre)  
**Solución:** Usar aliases explícitos (ej: `au.display_name`)  
**Ejemplo:** `docs/supabase/FIX_request_password_reset_ambiguous.sql`

### Error: "function does not exist"

**Causa:** Migración SQL no aplicada  
**Solución:** Aplicar migración en Supabase SQL Editor  
**Verificar:** `SELECT proname FROM pg_proc WHERE proname = 'function_name';`

### Error: "ERR_CONNECTION_REFUSED"

**Causa:** Servidor local no está corriendo  
**Solución:** Ejecutar `npm run dev`  
**Ver:** `docs/TROUBLESHOOTING_LOCAL_DEVELOPMENT.md`

---

## 🔍 Debugging

### Logging
- Usar prefijos: `[MODULE_NAME] Mensaje`
- En desarrollo: logging detallado
- En producción: solo errores críticos

### Supabase Queries
- Verificar en Supabase Dashboard → SQL Editor
- Probar queries directamente antes de usar en código

### Sync Service
- Ver logs en Vercel/Railway/Render
- Verificar que cron job está configurado
- Verificar variables de entorno

---

## ✅ Checklist de Troubleshooting

1. **Verificar variables de entorno**
   - Frontend: `.env` existe y tiene valores correctos
   - Sync: Variables configuradas en plataforma de deploy

2. **Verificar migraciones SQL**
   - Tablas existen
   - Funciones RPC existen
   - Vistas existen

3. **Verificar sync service**
   - Está corriendo
   - Cron job configurado
   - Logs sin errores

4. **Verificar código**
   - Imports correctos
   - No hay errores de sintaxis
   - Tests pasan

---

## 🔗 Referencias

- Local Development: `docs/TROUBLESHOOTING_LOCAL_DEVELOPMENT.md`
- Cache Issues: `docs/TROUBLESHOOTING_CACHE.md`
- Workflow: `docs/TROUBLESHOOTING_WORKFLOW.md`

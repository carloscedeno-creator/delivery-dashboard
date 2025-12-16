# ✅ Sistema de Sincronización Notion → Supabase - LISTO

## 🎉 Estado: Completo y Listo para Usar

El sistema de sincronización automática de Notion está completamente implementado y listo para usar.

## 📦 Componentes Implementados

### 1. ✅ Script de Sincronización (`scripts/sync-notion-initiatives.js`)
- Obtiene iniciativas automáticamente del CSV de productos
- Busca páginas en Notion usando búsqueda global
- Extrae métricas de propiedades de Notion (Status, Story Points, Completion)
- Maneja múltiples variaciones de nombres de propiedades
- Sincroniza con Supabase usando upsert
- Muestra resumen detallado de la sincronización

### 2. ✅ Servicio Automático (`scripts/notion-sync-service.js`)
- Usa `node-cron` para ejecución cada 30 minutos
- Ejecuta sincronización inicial al iniciar
- Maneja errores y reinicios
- Muestra estado cada hora
- Cierre graceful con Ctrl+C

### 3. ✅ Procesador de Datos Mejorado
- Extrae métricas desde propiedades de Notion
- Soporta múltiples tipos de propiedades (title, number, select, status, formula, etc.)
- Maneja variaciones de nombres:
  - Status: `Status`, `status`, `Estado`, `estado`
  - Story Points: `Story Points`, `Story point estimate`, `Points`
  - Completion: `Completion`, `Completion %`, `Progress`, `Progress %`
- Incluye todas las propiedades para debugging

### 4. ✅ Script SQL (`docs/supabase/04_create_notion_metrics_table.sql`)
- Crea tabla `notion_extracted_metrics` con estructura completa
- Incluye índices para optimización
- Configura RLS (Row Level Security)
- Trigger para `updated_at` automático
- Documentación en comentarios

### 5. ✅ Documentación
- `docs/NOTION_AUTO_SYNC.md` - Guía completa de uso
- `docs/NOTION_SUPABASE_PENDIENTE.md` - Actualizado con estado actual
- Instrucciones de despliegue (GitHub Actions, Railway, Vercel, etc.)

### 6. ✅ Scripts NPM
- `npm run sync:notion` - Sincronización manual
- `npm run sync:notion:service` - Servicio automático

## 🚀 Próximos Pasos (Para Completar la Configuración)

### Paso 1: Crear Tabla en Supabase ⚠️

**Ejecutar el script SQL:**

1. Abre Supabase Dashboard → SQL Editor
2. Copia el contenido de `docs/supabase/04_create_notion_metrics_table.sql`
3. Pega y ejecuta el script
4. Verifica que la tabla `notion_extracted_metrics` se creó correctamente

### Paso 2: Verificar Variables de Entorno ⚠️

Asegúrate de tener en tu `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### Paso 3: Probar Sincronización Manual ✅

```bash
npm run sync:notion
```

**Qué esperar:**
- Obtiene iniciativas del CSV
- Busca cada iniciativa en Notion
- Extrae métricas
- Sincroniza con Supabase
- Muestra resumen con estadísticas

### Paso 4: Iniciar Servicio Automático ✅

Si la sincronización manual funciona:

```bash
npm run sync:notion:service
```

El servicio:
- Ejecuta una sincronización inicial en 5 segundos
- Programa sincronizaciones cada 30 minutos
- Muestra estado cada hora
- Se puede detener con Ctrl+C

## 📊 Estructura de Datos

### Tabla: `notion_extracted_metrics`

```sql
- id: UUID (PK)
- initiative_name: VARCHAR(255) - Nombre de la iniciativa
- extraction_date: DATE - Fecha de extracción
- status: VARCHAR(50) - Estado (planned, in_progress, done, blocked)
- completion_percentage: INTEGER - Porcentaje de completación (0-100)
- story_points_done: INTEGER - Story points completados
- story_points_total: INTEGER - Story points totales
- raw_metrics: JSONB - Todas las propiedades de Notion
- source: VARCHAR(50) - Origen (notion_sync)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Constraint único:** `(initiative_name, extraction_date)` - Una métrica por iniciativa por día

## 🔄 Flujo de Sincronización

```
1. Obtener iniciativas del CSV de productos
   ↓
2. Para cada iniciativa:
   ↓
3. Buscar páginas en Notion (búsqueda global)
   ↓
4. Extraer métricas de propiedades
   ↓
5. Sincronizar con Supabase (upsert)
   ↓
6. Mostrar resumen
```

## 🛠️ Troubleshooting

### Error: Missing Supabase configuration
**Solución:** Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén en `.env`

### Error: Table does not exist
**Solución:** Ejecuta el script SQL `docs/supabase/04_create_notion_metrics_table.sql` en Supabase

### Error: No Notion pages found
**Causas posibles:**
- Nombre de iniciativa no coincide exactamente
- Página no compartida con integración de Notion
- Proxy de Notion no configurado

**Solución:** Verifica nombres en CSV vs Notion, y que el proxy esté funcionando

## 📈 Monitoreo

El servicio muestra:
- Total de sincronizaciones ejecutadas
- Última sincronización
- Estado actual (running/stopped)
- Estadísticas de éxito/fallo por iniciativa

## 🚢 Opciones de Despliegue

### Opción 1: Servidor Local/VM
```bash
pm2 start npm --name "notion-sync" -- run sync:notion:service
```

### Opción 2: GitHub Actions
Ver ejemplo en `docs/NOTION_AUTO_SYNC.md`

### Opción 3: Railway/Render
- Conecta repositorio
- Configura variables de entorno
- Usa comando: `npm run sync:notion:service`

### Opción 4: Vercel Cron Jobs
Ver ejemplo en `docs/NOTION_AUTO_SYNC.md`

## ✅ Checklist Final

- [x] Script de sincronización creado
- [x] Servicio automático con node-cron
- [x] Procesador de datos mejorado
- [x] Script SQL para tabla
- [x] Documentación completa
- [x] Scripts NPM configurados
- [ ] **Tabla creada en Supabase** ⚠️
- [ ] **Variables de entorno configuradas** ⚠️
- [ ] **Sincronización manual probada** ⚠️
- [ ] **Servicio automático iniciado** ⚠️

## 📚 Referencias

- [Documentación Completa](./NOTION_AUTO_SYNC.md)
- [Estado Pendiente](./NOTION_SUPABASE_PENDIENTE.md)
- [Script SQL](./supabase/04_create_notion_metrics_table.sql)

---

**Última actualización:** Sistema completo y listo. Solo falta ejecutar el script SQL y probar.

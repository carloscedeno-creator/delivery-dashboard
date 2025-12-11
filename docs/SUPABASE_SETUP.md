# Configuración de Supabase para Delivery Dashboard

## 📋 Resumen

Este documento explica cómo configurar la integración con Supabase para usar los datos de métricas de delivery que se actualizan automáticamente cada 30 minutos desde Jira.

## 🚀 Configuración Rápida

### 1. Obtener Credenciales de Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia los siguientes valores:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public** key (la clave pública, no la service_role)

### 2. Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto (si no existe)
2. Agrega las siguientes variables:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

**⚠️ Importante:** 
- Nunca subas el archivo `.env` a Git (ya está en `.gitignore`)
- Usa la clave `anon` (pública), nunca la `service_role` (privada)

### 3. Verificar que el Esquema Esté Aplicado

Asegúrate de que el esquema de base de datos esté aplicado en tu proyecto de Supabase. Ver:
- `D:\Agile Dream Team\Cursor\GooglescriptsDelivery\docs\supabase\README.md`
- Aplica las migraciones en orden: `01_create_schema.sql`, `02_setup_rls.sql`, `03_views_utiles.sql`

### 4. Configurar Row Level Security (RLS)

Para que el dashboard pueda leer las métricas, necesitas permitir acceso público (o autenticado) a las vistas:

```sql
-- Permitir lectura pública de métricas de sprints
CREATE POLICY "Allow public read access to sprint metrics"
ON v_sprint_metrics_complete
FOR SELECT
USING (true);

-- Permitir lectura pública de métricas de desarrolladores
CREATE POLICY "Allow public read access to developer metrics"
ON v_developer_sprint_metrics_complete
FOR SELECT
USING (true);

-- Permitir lectura pública de proyectos
CREATE POLICY "Allow public read access to projects"
ON projects
FOR SELECT
USING (true);

-- Permitir lectura pública de issues
CREATE POLICY "Allow public read access to issues"
ON issues
FOR SELECT
USING (true);
```

## 🧪 Probar la Conexión

1. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

2. Ve a la aplicación en tu navegador
3. Haz clic en **"Supabase Test"** en el menú de navegación
4. Deberías ver:
   - ✅ Estado de conexión (verde = conectado)
   - 📊 Datos de sprints
   - 👥 Métricas de desarrolladores
   - 📈 Issues por estado

## 📊 Estructura de Datos

### Vistas Disponibles

El dashboard usa las siguientes vistas de Supabase:

1. **`v_sprint_metrics_complete`** - Métricas completas por sprint
   - `sprint_name`, `project_name`, `state`
   - `total_sp`, `completed_sp`, `carryover_sp`
   - `start_date`, `end_date`, `complete_date`
   - Y más...

2. **`v_developer_sprint_metrics_complete`** - Métricas por desarrollador y sprint
   - `developer_name`, `sprint_name`
   - `workload_sp`, `velocity_sp`, `carryover_sp`
   - `avg_lead_time_days`
   - Y más...

3. **`projects`** - Proyectos de Jira
4. **`issues`** - Tickets/Issues de Jira
5. **`developers`** - Desarrolladores

## 🔄 Sincronización de Datos

Los datos se actualizan automáticamente cada 30 minutos mediante el servicio:
- `D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync\`

Asegúrate de que este servicio esté ejecutándose para tener datos actualizados.

## 🐛 Troubleshooting

### Error: "Supabase no está configurado"

**Solución:**
- Verifica que el archivo `.env` existe en la raíz del proyecto
- Verifica que las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` están configuradas
- Reinicia el servidor de desarrollo después de crear/modificar `.env`

### Error: "Error de conexión" o "Unauthorized"

**Solución:**
- Verifica que la URL de Supabase es correcta (debe terminar en `.supabase.co`)
- Verifica que estás usando la clave `anon` (pública), no la `service_role`
- Verifica que las políticas RLS están configuradas correctamente

### No se muestran datos

**Solución:**
- Verifica que el esquema de base de datos está aplicado
- Verifica que el servicio de sincronización está ejecutándose
- Verifica que hay datos en las tablas (puedes verificar en Supabase Dashboard → Table Editor)
- Verifica que el `project_key` en las consultas coincide con tu proyecto (default: 'OBD')

### Error: "relation does not exist"

**Solución:**
- Asegúrate de que las migraciones SQL están aplicadas
- Verifica que las vistas existen: `v_sprint_metrics_complete`, `v_developer_sprint_metrics_complete`

## 📝 Próximos Pasos

Una vez que la conexión funcione:

1. ✅ Verifica que los datos se muestran correctamente en "Supabase Test"
2. ⏳ Actualiza `DeveloperWorkload.jsx` para usar datos de Supabase
3. ⏳ Actualiza otros componentes para usar métricas de Supabase
4. ⏳ Implementa caché para mejorar performance
5. ⏳ Agrega indicadores de última actualización

## 📚 Referencias

- [Documentación de Supabase](https://supabase.com/docs)
- [Integración con Google Scripts](./INTEGRACION_GOOGLE_SCRIPTS.md)
- [Esquema de Base de Datos](../../GooglescriptsDelivery/docs/supabase/README.md)

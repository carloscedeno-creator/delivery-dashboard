# Aplicar Migración: role_permission_config

## Error Actual

Si ves el error:
```
Error saving permissions: Could not find the table 'public.role_permission_config' in the schema cache
```

Significa que la tabla `role_permission_config` no existe en tu base de datos de Supabase.

## Solución: Ejecutar Migración SQL

### Opción 1: Ejecutar Manualmente en Supabase SQL Editor (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre SQL Editor**
   - En el menú lateral, haz clic en **SQL Editor**
   - O ve directamente a: `https://supabase.com/dashboard/project/[TU_PROJECT_ID]/sql`

3. **Copia el contenido del archivo SQL**
   - Abre el archivo: `docs/supabase/12_create_role_permission_config.sql`
   - Copia todo el contenido

4. **Pega y ejecuta**
   - Pega el SQL en el editor
   - Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

5. **Verifica que se creó**
   - Ejecuta esta query para verificar:
   ```sql
   SELECT * FROM role_permission_config LIMIT 1;
   ```
   - Deberías ver una tabla vacía (sin errores)

### Opción 2: Usar el Script de Node.js

```bash
# Asegúrate de tener SUPABASE_SERVICE_ROLE_KEY en tu .env
npm run apply-role-permission-migration
```

**Nota:** Este script puede tener limitaciones. Es mejor ejecutar manualmente en Supabase SQL Editor.

## Contenido de la Migración

La migración crea:

1. **Tabla `role_permission_config`**
   - Almacena permisos personalizados por rol
   - Campos: `role`, `modules` (array), `created_at`, `updated_at`

2. **Índices**
   - Para búsquedas rápidas por rol

3. **Trigger**
   - Actualiza automáticamente `updated_at` cuando se modifica un registro

4. **RLS Policies**
   - Solo usuarios con rol `admin` pueden leer/escribir
   - Usuarios autenticados pueden leer

5. **Funciones**
   - `update_role_permission_config_updated_at()` - Trigger function

## Verificación Post-Migración

Después de ejecutar la migración, verifica:

```sql
-- Verificar que la tabla existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'role_permission_config';

-- Verificar estructura
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'role_permission_config';

-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename = 'role_permission_config';
```

## Si la Migración Falla

1. **Verifica permisos**: Asegúrate de estar usando una cuenta con permisos de administrador en Supabase
2. **Revisa errores**: Lee el mensaje de error completo en Supabase SQL Editor
3. **Ejecuta por partes**: Si hay errores, intenta ejecutar el SQL por secciones:
   - Primero crear la tabla
   - Luego los índices
   - Después los triggers
   - Finalmente las políticas RLS

## Después de la Migración

Una vez que la tabla esté creada:

1. **Recarga la aplicación** en el navegador
2. **Ve a Admin → Role Access**
3. **Configura los permisos** según necesites
4. **Guarda los cambios** - ahora debería funcionar sin errores

## Notas Importantes

- La tabla es **opcional**: Si no existe, el sistema usa los permisos por defecto de `permissions.js`
- Los permisos personalizados **sobrescriben** los defaults cuando existen
- Los cambios toman efecto **inmediatamente** después de guardar


# 📋 Ejecutar SQL Manualmente en Supabase

## ✅ Estado Actual

El script de sincronización se ejecutó correctamente y generó el SQL con las fechas de épicas:
- ✅ 67 épicas obtenidas con fechas del timeline
- ✅ SQL generado: `insert_all_squads.sql` (11,157 statements)
- ✅ Las fechas están incluidas en los INSERT de `initiatives`

## 🚀 Pasos para Ejecutar el SQL

### Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new
2. Se abrirá el editor SQL

### Paso 2: Cargar el Archivo SQL

**Opción A: Copiar y Pegar (Recomendado para archivos grandes)**

1. Abre el archivo: `d:\Agile Dream Team\Cursor\GooglescriptsDelivery\scripts\insert_all_squads.sql`
2. Selecciona todo el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el editor SQL de Supabase (Ctrl+V)

**Opción B: Cargar desde Archivo**

1. En el editor SQL de Supabase, busca el botón "Upload" o "Load file"
2. Selecciona el archivo: `insert_all_squads.sql`

### Paso 3: Ejecutar el SQL

1. Haz clic en el botón **"Run"** o presiona `Ctrl+Enter`
2. Espera a que se ejecute (puede tomar varios minutos por el tamaño)
3. Verás el progreso y resultados en la parte inferior

## ⚠️ Notas Importantes

- **Tamaño del archivo**: 11,157 statements SQL
- **Tiempo estimado**: 2-5 minutos dependiendo de la conexión
- **No interrumpas**: Deja que termine la ejecución
- **Verificación**: Después de ejecutar, verifica que las épicas tengan fechas en el dashboard

## ✅ Verificar que Funcionó

1. Ve al Delivery Roadmap en el dashboard
2. Las épicas deberían mostrar barras de timeline con fechas correctas
3. Revisa la consola del navegador (F12) para ver logs de fechas

## 🔍 Si Hay Errores

- **Error de sintaxis**: Verifica que copiaste todo el contenido correctamente
- **Timeout**: El archivo es grande, intenta ejecutarlo en partes más pequeñas
- **Permisos**: Asegúrate de tener permisos de escritura en las tablas

## 📝 Alternativa: Ejecutar en Partes

Si el archivo es demasiado grande, puedes dividirlo:

1. Abre `insert_all_squads.sql` en un editor de texto
2. Divide el archivo en secciones (por ejemplo, por squad)
3. Ejecuta cada sección por separado en Supabase SQL Editor





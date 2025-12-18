# 📋 Ejecutar SQL en Lotes (Solución para Archivos Grandes)

## ✅ Estado Actual

El archivo SQL grande se dividió en **24 lotes** más pequeños:
- ✅ Cada lote tiene aproximadamente 500 statements
- ✅ Los archivos están en: `scripts/sql_batches/`
- ✅ Nombres: `batch_001.sql`, `batch_002.sql`, ..., `batch_024.sql`

## 🚀 Pasos para Ejecutar

### Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://app.supabase.com/project/sywkskwkexwwdzrbwinp/sql/new
2. Mantén esta pestaña abierta

### Paso 2: Ejecutar Cada Lote en Orden

**IMPORTANTE:** Ejecuta los lotes en orden numérico (001, 002, 003, etc.)

Para cada lote:

1. Abre el archivo: `d:\Agile Dream Team\Cursor\GooglescriptsDelivery\scripts\sql_batches\batch_XXX.sql`
2. Selecciona todo el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el editor SQL de Supabase (Ctrl+V)
5. Haz clic en **"Run"** o presiona `Ctrl+Enter`
6. Espera a que termine (cada lote toma ~10-30 segundos)
7. Verifica que no haya errores
8. Limpia el editor (Ctrl+A, Delete) y continúa con el siguiente lote

### Paso 3: Lista de Archivos a Ejecutar

Ejecuta en este orden:

1. `batch_001.sql` (500 statements)
2. `batch_002.sql` (500 statements)
3. `batch_003.sql` (500 statements)
4. `batch_004.sql` (500 statements)
5. `batch_005.sql` (500 statements)
6. `batch_006.sql` (500 statements)
7. `batch_007.sql` (500 statements)
8. `batch_008.sql` (500 statements)
9. `batch_009.sql` (500 statements)
10. `batch_010.sql` (500 statements)
11. `batch_011.sql` (500 statements)
12. `batch_012.sql` (500 statements)
13. `batch_013.sql` (500 statements)
14. `batch_014.sql` (500 statements)
15. `batch_015.sql` (500 statements)
16. `batch_016.sql` (500 statements)
17. `batch_017.sql` (500 statements)
18. `batch_018.sql` (500 statements)
19. `batch_019.sql` (500 statements)
20. `batch_020.sql` (500 statements)
21. `batch_021.sql` (500 statements)
22. `batch_022.sql` (500 statements)
23. `batch_023.sql` (500 statements)
24. `batch_024.sql` (233 statements) ⬅️ Último

## ⏱️ Tiempo Estimado

- **Por lote**: 10-30 segundos
- **Total**: 5-10 minutos para todos los lotes

## ✅ Verificar que Funcionó

Después de ejecutar todos los lotes:

1. Ve al Delivery Roadmap en el dashboard
2. Las épicas deberían mostrar barras de timeline con fechas correctas
3. Revisa la consola del navegador (F12) para ver logs de fechas

## 🔍 Si Hay Errores

- **Error en un lote específico**: Anota el número del lote y continúa con los demás. Puedes volver a ejecutar ese lote después.
- **Timeout**: Si un lote es demasiado grande, puedes dividirlo manualmente en partes más pequeñas.
- **Errores de duplicados**: Es normal ver algunos errores de "duplicate key" si los datos ya existen. Esto es seguro ignorar.

## 💡 Consejo

Puedes ejecutar varios lotes seguidos sin esperar, pero es mejor verificar que cada uno termine correctamente antes de continuar.





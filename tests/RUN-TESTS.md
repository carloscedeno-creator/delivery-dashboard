# 🧪 Cómo Ejecutar los Tests de los Módulos de Data

## 📋 Tests Creados

Se han creado conjuntos completos de tests para validar que los módulos `DeliveryRoadmapData` y `ProductRoadmapData` estén correctamente aislados y funcionando.

## 📦 Módulos Disponibles

- **DeliveryRoadmapData**: Tests en `tests/validate-delivery-module.js`
- **ProductRoadmapData**: Tests en `tests/validate-product-module.js`

## 🚀 Método 1: Test en Consola del Navegador (Recomendado)

### Para DeliveryRoadmapData:

1. **Abre el dashboard:**
   ```bash
   # El servidor ya está corriendo en http://localhost:8000
   # O simplemente abre index.html en el navegador
   ```

2. **Abre la consola del navegador** (F12)

3. **Copia y pega el script de validación:**
   - Abre el archivo `tests/validate-delivery-module.js`
   - Copia todo el contenido
   - Pégalo en la consola del navegador
   - Presiona Enter

4. **Revisa los resultados:**
   - Verás tests con ✅ (pass) o ❌ (fail)
   - Todos deberían pasar

### Para ProductRoadmapData:

1. **Abre el dashboard** (mismo paso que arriba)

2. **Abre la consola del navegador** (F12)

3. **Copia y pega el script de validación:**
   - Abre el archivo `tests/validate-product-module.js`
   - Copia todo el contenido
   - Pégalo en la consola del navegador
   - Presiona Enter

4. **Revisa los resultados:**
   - Verás tests con ✅ (pass) o ❌ (fail)
   - Todos deberían pasar

## 📊 Tests que se Ejecutan

### DeliveryRoadmapData Tests:

#### ✅ Test 1: Module Exists
Verifica que el módulo `DeliveryRoadmapData` existe

#### ✅ Test 2: Module Structure
Verifica que tiene:
- `SHEET_URLS`
- `MOCK_DATA`
- `parseCSV` function
- `load` function

#### ✅ Test 3: Sheet URLs (Delivery Only)
Verifica que:
- URLs apuntan al Google Sheet correcto
- NO tiene URLs de Product Roadmap
- Tiene gids correctos (1503252593, 1194298779)

#### ✅ Test 4: Mock Data Structure
Verifica que:
- Tiene arrays de projects y allocation
- Los datos tienen los campos correctos
- NO tiene campos de Product Roadmap

#### ✅ Test 5: Parse CSV Function
Prueba que parsea:
- CSV de tipo 'project'
- CSV de tipo 'allocation'
- Convierte números correctamente

#### ✅ Test 6: Isolation Check
Verifica que NO hay:
- Variables globales `MOCK_PROJECT_DATA`
- Variables globales `MOCK_ALLOCATION_DATA`
- Variables globales `SHEET_URLS`

### ProductRoadmapData Tests:

#### ✅ Test 1: Module Structure
Verifica que tiene:
- `SHEET_URLS` (initiatives, bugRelease)
- `MOCK_DATA` (initiatives, bugRelease)
- `parseCSV` function
- `load` function

#### ✅ Test 2: Sheet URLs (Product Only)
Verifica que:
- URLs apuntan al Google Sheet correcto
- NO tiene URLs de Delivery Roadmap
- Tiene gids correctos (933125518, 1707343419)

#### ✅ Test 3: Mock Data Structure
Verifica que:
- Tiene arrays de initiatives y bugRelease
- Los datos tienen los campos correctos
- NO tiene campos de Delivery Roadmap

#### ✅ Test 4: Parse CSV Function
Prueba que parsea:
- CSV de tipo 'initiatives'
- CSV de tipo 'bugRelease'
- Convierte números correctamente (effort, completion)

#### ✅ Test 5: Isolation Check
Verifica que NO hay:
- Variables globales `MOCK_PRODUCT_INITIATIVES`
- Variables globales `MOCK_PRODUCT_BUG_RELEASE`
- Variables globales `PRODUCT_SHEET_URLS`

#### ✅ Test 6: Separation from Delivery Module
Verifica que:
- Product no tiene datos de Delivery
- Delivery no tiene datos de Product
- Ambos módulos pueden coexistir

## 🎯 Resultado Esperado

Todos los tests deberían mostrar ✅ (verde), indicando que:

- ✅ Los módulos están completamente aislados
- ✅ No se mezclan entre sí
- ✅ Están correctamente estructurados
- ✅ Funcionan como se espera

## 🔧 Si algún test falla

Si ves ❌ en algún test:

1. Revisa el mensaje de error
2. Verifica que el módulo esté bien definido en `index.html`
3. Asegúrate de que no haya variables globales mezcladas
4. Verifica que las URLs de Google Sheets sean correctas

## 📝 Estado de los Módulos

Una vez que todos los tests pasen:

1. ✅ Módulo Delivery está blindado y aislado
2. ✅ Módulo Product está blindado y aislado
3. ✅ Ambos módulos funcionan independientemente
4. ✅ Fácil de mantener y extender

## 🧪 Ejecutar Ambos Tests en Secuencia

Puedes ejecutar ambos tests uno tras otro para validar todo el sistema:

```javascript
// En la consola del navegador:
// 1. Ejecuta tests/validate-delivery-module.js
// 2. Luego ejecuta tests/validate-product-module.js
```

O crear un script combinado que ejecute ambos.


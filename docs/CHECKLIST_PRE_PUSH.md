# ⚠️ CHECKLIST OBLIGATORIO ANTES DE PUSH

## 🚨 IMPORTANTE: Este proceso es OBLIGATORIO antes de cada push

### Paso 1: Actualizar Pruebas ✅

**ANTES de hacer commit o push, SIEMPRE:**

1. **Revisar qué cambios se hicieron:**
   ```bash
   git status
   git diff
   ```
   - ¿Se modificaron servicios o APIs?
   - ¿Se agregaron nuevas funcionalidades?
   - ¿Se cambiaron cálculos de métricas?

2. **Actualizar pruebas existentes:**
   - Buscar archivos de prueba relacionados: `tests/unit/*.test.js` o `tests/unit/*.test.jsx`
   - Actualizar pruebas para reflejar nuevos comportamientos
   - Agregar pruebas para nuevas funcionalidades

3. **Crear nuevas pruebas si es necesario:**
   - **Mínimo 5 pruebas** para nuevas features
   - **Mínimo 2 pruebas** para bug fixes (incluyendo regresión)
   - Cubrir casos exitosos, errores, y casos límite

### Paso 2: Ejecutar Pruebas ✅

**SIEMPRE ejecutar antes de push:**

```bash
npm test
```

**O con yarn:**
```bash
yarn test
```

**Verificar que:**
- ✅ Todas las pruebas pasan
- ✅ No hay errores de sintaxis
- ✅ No hay warnings críticos
- ✅ Cobertura de código es adecuada

### Paso 3: Verificar Linting ✅

**SIEMPRE ejecutar antes de push:**

```bash
npm run lint
```

**O con yarn:**
```bash
yarn lint
```

**Verificar que:**
- ✅ No hay errores de linting
- ✅ Código sigue los estándares del proyecto

### Paso 4: Commit y Push ✅

**Solo después de que TODO lo anterior pase:**

```bash
# Agregar archivos
git add .

# Commit con mensaje descriptivo
git commit -m "feat: Descripción del cambio"

# Push (los hooks ejecutarán pruebas automáticamente)
git push origin <branch-name>
```

## 📋 Checklist Rápido

Antes de cada push, verificar:

- [ ] **Pruebas actualizadas** - ¿Reflejan los cambios realizados?
- [ ] **Nuevas pruebas creadas** - ¿Para nuevas funcionalidades o bug fixes?
- [ ] **Pruebas ejecutadas** - `npm test` pasa sin errores
- [ ] **Linting ejecutado** - `npm run lint` pasa sin errores
- [ ] **Código revisado** - ¿Está limpio y sigue estándares?
- [ ] **Documentación actualizada** - ¿Si es necesario?

## 🚫 NO hacer push si:

- ❌ Las pruebas fallan
- ❌ Hay errores de linting
- ❌ No se actualizaron las pruebas para cambios significativos
- ❌ El código tiene warnings críticos sin resolver

## 📝 Notas Importantes

1. **Los hooks de git ejecutarán pruebas automáticamente**, pero es mejor ejecutarlas manualmente antes para detectar problemas temprano.

2. **Si necesitas hacer push urgente** y las pruebas fallan por razones no relacionadas con tus cambios:
   - Documenta por qué es urgente
   - Crea un issue para arreglar las pruebas después
   - Usa `--no-verify` solo como último recurso y documenta el motivo

3. **Para cambios relacionados con métricas o cálculos**, asegúrate de:
   - Probar con datos reales de sprints cerrados
   - Validar que el filtro de tickets removidos funciona
   - Verificar que los cálculos coinciden con Excel/formulas esperadas

## 🔍 Archivos de Prueba Relevantes

- `tests/unit/projectMetricsApi.test.js` - Pruebas para Project Metrics API
- `tests/unit/teamHealthKPIService.test.js` - Pruebas para Team Health KPI Service
- `tests/unit/statusHelper.test.js` - Pruebas para Status Helper
- `tests/unit/ProjectsMetrics.test.jsx` - Pruebas para componente ProjectsMetrics

## 📚 Referencias

- Ver `.cursor/rules/testing-standards.mdc` para estándares de pruebas
- Ver `.cursor/rules/best-practices.mdc` para mejores prácticas de código
- Ver `docs/CHECKLIST_PRE_PUSH.md` (este archivo) antes de cada push

## 🔄 Proceso Completo

```bash
# 1. Actualizar pruebas
# Editar archivos de prueba según cambios realizados

# 2. Ejecutar pruebas
npm test

# 3. Ejecutar linting
npm run lint

# 4. Si todo pasa, hacer commit y push
git add .
git commit -m "feat: Descripción del cambio"
git push origin <branch-name>
```

---

**Última actualización:** 2026-01-XX  
**Recordatorio:** Este checklist es OBLIGATORIO antes de cada push

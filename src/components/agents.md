# Agents Notes - Components

**Última actualización:** 2024-12-19

---

## ⚠️ CRITICAL: Icon Import Verification

**ERROR ENCONTRADO:** `Timeline` no existe en `lucide-react`
- **Fecha:** 2024-12-19
- **Archivo:** `OverallView.jsx`
- **Error:** `The requested module does not provide an export named 'Timeline'`
- **Solución:** Reemplazado con `BarChart3` que sí existe

**REGLAS DE VERIFICACIÓN OBLIGATORIAS:**
1. **SIEMPRE** verificar que el icono existe en lucide-react antes de importarlo
2. Consultar https://lucide.dev/icons/ para buscar iconos disponibles
3. Usar iconos comunes y documentados (ver lista abajo)
4. **NUNCA** asumir que un icono existe sin verificar
5. Si el icono no existe, usar el más cercano disponible (ej: `BarChart3` para timeline, `SquareChartGantt` para Gantt charts)

**Iconos válidos comunes:**
- `Calendar`, `Clock`, `AlertCircle`, `CheckCircle2`, `XCircle`, `AlertTriangle`
- `Truck`, `Shield`, `Heart`, `TrendingUp`, `BarChart3`, `Activity`
- `Users`, `Settings`, `Home`, `Search`, `Filter`, `Download`
- `Plus`, `Minus`, `Edit`, `Save`, `Trash`, `RefreshCw`
- `SquareChartGantt`, `ChartNoAxesGantt` (para timelines/Gantt)

**Checklist antes de usar iconos:**
- [ ] Verificar en https://lucide.dev/icons/
- [ ] Usar nombre exacto (case-sensitive)
- [ ] Si no existe, buscar alternativa similar
- [ ] Probar import antes de usar en componente

---

## Patrones y Decisiones de Diseño

### ProjectsMetrics Component
- ✅ Carga scope changes automáticamente cuando se selecciona sprint
- ✅ Usa `getSprintScopeChanges()` de `projectMetricsApi.js`
- ✅ Muestra sección "Scope Changes" solo si hay datos
- Estado: `scopeChanges` se inicializa como `null`
- Función: `loadScopeChanges(sprintId)` carga datos

### DeveloperMetrics Component
- ✅ Usa `statusHelper.js` indirectamente a través de `developerMetricsApi.js`
- ✅ No tiene lógica hardcodeada de estatus
- Ver: `src/utils/developerMetricsApi.js`

### Login Component
- ✅ Integrado con Supabase Auth
- ✅ Maneja navegación a "Forgot Password"
- ✅ Usa `authService.js` para autenticación

### ForgotPassword / ResetPassword Components
- ✅ Password recovery flow completo
- ✅ En desarrollo: muestra token en consola para testing
- ✅ Usa `authService.js` para reset flow

---

## Bugs Evitados / Lecciones Aprendidas

### Bug: Imports de react-router-dom innecesarios
**Fecha:** 2024-12-19  
**Problema:** ResetPassword.jsx importaba `useNavigate` pero no lo usaba  
**Solución:** Remover import innecesario  
**Regla agregada:** Verificar imports antes de commit

### Bug: Estado scopeChanges no inicializado
**Fecha:** 2024-12-19  
**Problema:** ProjectsMetrics no tenía estado `scopeChanges` ni función `loadScopeChanges`  
**Solución:** Agregar estado y función  
**Regla agregada:** Verificar que todos los estados necesarios estén declarados

### Bug: Import de icono Timeline inexistente
**Fecha:** 2024-12-19  
**Problema:** `Timeline` no existe en `lucide-react`, causando error de runtime  
**Solución:** Reemplazado con `BarChart3`  
**Regla agregada:** Verificar iconos en https://lucide.dev/icons/ antes de importar

---

## Referencias

- API Guidelines: `/reference/api_guidelines.md`
- UI Components: `/reference/ui_components.md`
- Auth Service: `src/utils/authService.js`

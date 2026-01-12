# Agents Notes - Components

**Última actualización:** 2024-12-19

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

---

## Referencias

- API Guidelines: `/reference/api_guidelines.md`
- UI Components: `/reference/ui_components.md`
- Auth Service: `src/utils/authService.js`

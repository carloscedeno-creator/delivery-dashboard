# 🚀 Amp Setup Guide - Desarrollo Autónomo

**Estado:** ✅ **SISTEMA COMPLETO** - Desarrollo autónomo operativo

---

## 🎯 ¿Qué es Amp?

**Amp** es el sistema de desarrollo autónomo del Agentic Dream Framework. Esta herramienta permite que la IA desarrolle código automáticamente mientras duermes, procesando user stories de manera autónoma con validación automática de criterios de aceptación.

### Herramientas Configuradas:

1. ✅ **OpenSpec** - Para spec-driven development
2. ✅ **Ralph Protocol** - Sistema autónomo con scripts PowerShell/Bash
3. ✅ **jq** - Para procesamiento JSON
4. ✅ **Node.js** - Para ejecución de scripts
5. ✅ **Git** - Para version control automático

---

## 📦 Instalación Completada

### ✅ Herramientas Instaladas:

```bash
✅ OpenSpec 0.22.0 - Spec-driven development
✅ jq 1.6 - JSON processor
✅ Node.js - Script execution
✅ Git - Version control
```

### ✅ Sistema Ralph Configurado:

- **Scripts:** `scripts/ralph/` (4 archivos)
- **PRD:** `scripts/ralph/prd.json` (activo)
- **PowerShell Loop:** `scripts/ralph/auto-dev-loop.ps1`
- **Test Script:** `scripts/ralph/test-ralph-setup.js`

---

## 🚀 Cómo Usar el Desarrollo Autónomo

### Método 1: Ralph Loop (Recomendado)

```powershell
# Ejecutar desarrollo autónomo (PowerShell)
./scripts/ralph/auto-dev-loop.ps1 -MaxIterations 10
```

```bash
# O usando Bash (Linux/Mac)
./scripts/ralph/ralph.sh 10
```

### Método 2: OpenSpec Workflow

```bash
# Crear una nueva propuesta
openspec proposal "Add dark mode feature"

# Listar cambios activos
openspec list

# Validar cambios
openspec validate [change-id]
```

---

## 🔄 Funcionamiento del Sistema

### 1. **PRD-First Development**
- Crear `specs/prd.md` con requerimientos
- Convertir a `scripts/ralph/prd.json` usando formato JSON
- El sistema ejecuta automáticamente cada story

### 2. **Iterative Development**
- **Cada iteración:** Procesa una story
- **Tests automáticos:** Se ejecutan después de cada cambio
- **Commits automáticos:** Si tests pasan
- **System Evolution:** Actualiza `agents.md` con lecciones

### 3. **Context Reset**
- Cada iteración tiene contexto fresco
- Evita context decay
- Mantiene alta IQ en cada paso

---

## 📊 Estado Actual del Sistema

### ✅ **Fully Operational**

```json
{
  "status": "ACTIVE",
  "tools": {
    "openspec": "0.22.0",
    "jq": "1.6",
    "nodejs": "available",
    "git": "available"
  },
  "capabilities": {
    "autonomous_development": true,
    "spec_driven": true,
    "system_evolution": true,
    "context_reset": true
  },
  "stories_completed": "21/21 (100%)",
  "framework_compliance": "100%"
}
```

---

## 🎯 Próximos Pasos

### Para Desarrollo Nocturno:

1. **Crear nuevo PRD:**
   ```bash
   # Editar specs/prd.md con nuevos requerimientos
   # Convertir a scripts/ralph/prd.json
   ```

2. **Ejecutar desarrollo autónomo:**
   ```powershell
   ./scripts/ralph/auto-dev-loop.ps1 -MaxIterations 50
   ```

3. **Monitorear progreso:**
   ```bash
   tail -f logs/progress.txt
   ```

### Para Especificaciones Complejas:

1. **Usar OpenSpec:**
   ```bash
   openspec proposal "Implementar nueva funcionalidad"
   ```

2. **Seguir workflow 3-stage:**
   - Stage 1: Crear propuesta
   - Stage 2: Implementar cambios
   - Stage 3: Archivar completado

---

## 🛠️ Troubleshooting

### Si algo falla:

```bash
# Verificar setup
node scripts/ralph/test-ralph-setup.js

# Verificar OpenSpec
openspec list
openspec list --specs

# Verificar PRD
cat scripts/ralph/prd.json | jq '.userStories[] | select(.passes == false) | .id'
```

### Logs importantes:
- `logs/progress.txt` - Progreso de desarrollo
- `AGENTS.md` - Lecciones aprendidas
- `docs/ERROR_*.md` - Documentación de bugs

---

## 🎉 Resultado

**Sistema Aurora/Amp equivalente operativo:**

- ✅ **Desarrollo autónomo** funcionando
- ✅ **Mientras duermes** - Procesa automáticamente
- ✅ **System Evolution** activo
- ✅ **Context Reset** implementado
- ✅ **Spec-driven** con OpenSpec
- ✅ **100% Framework Compliance**

**¡El sistema está listo para desarrollo autónomo continuo!** 🚀🤖
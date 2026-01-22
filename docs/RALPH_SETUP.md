# Configuración de Ralph - Autonomous AI Agent Loop

**Fecha:** 2024-12-19  
**Estado:** ✅ Configurado

---

## ¿Qué es Ralph?

Ralph es un agente autónomo de IA que ejecuta [Amp](https://ampcode.com) repetidamente hasta completar todos los items del PRD. Cada iteración es una instancia fresca de Amp con contexto limpio. La memoria persiste vía git history, `progress.txt`, y `prd.json`.

Basado en el [patrón Ralph de Geoffrey Huntley](https://ghuntley.com/ralph/).

---

## ✅ Configuración Completada

### 1. Archivos Copiados

- ✅ `scripts/ralph/ralph.sh` - Script principal de Ralph
- ✅ `scripts/ralph/prompt.md` - Instrucciones para cada iteración de Amp
- ✅ `scripts/ralph/prd.json.example` - Ejemplo de formato PRD

### 2. Skills Instaladas Globalmente

- ✅ `~/.config/amp/skills/prd/` - Skill para generar PRDs
- ✅ `~/.config/amp/skills/ralph/` - Skill para convertir PRDs a JSON

### 3. Configuración de Amp

**Archivo:** `~/.config/amp/settings.json`

```json
{
  "amp.experimental.autoHandoff": { "context": 90 }
}
```

Esto habilita el handoff automático cuando el contexto se llena, permitiendo que Ralph maneje historias grandes que exceden una ventana de contexto.

---

## ⚠️ Prerequisitos Pendientes

### jq (JSON Processor)

Ralph requiere `jq` para procesar JSON. En Windows:

**Opción 1: Usar Chocolatey**
```powershell
choco install jq
```

**Opción 2: Usar Scoop**
```powershell
scoop install jq
```

**Opción 3: Descargar binario**
- Descargar desde: https://stedolan.github.io/jq/download/
- Agregar al PATH

**Verificar instalación:**
```powershell
jq --version
```

---

## 📋 Workflow de Ralph

### Paso 1: Crear un PRD

Usa el skill PRD para generar un documento de requisitos detallado:

```
Load the prd skill and create a PRD for [descripción de tu feature]
```

Responde las preguntas de clarificación. El skill guarda el output en `tasks/prd-[feature-name].md`.

### Paso 2: Convertir PRD a formato Ralph

Usa el skill Ralph para convertir el PRD markdown a JSON:

```
Load the ralph skill and convert tasks/prd-[feature-name].md to prd.json
```

Esto crea `prd.json` con user stories estructuradas para ejecución autónoma.

**Importante:** El archivo debe guardarse en `scripts/ralph/prd.json`

### Paso 3: Ejecutar Ralph

```bash
# Desde la raíz del proyecto
./scripts/ralph/ralph.sh [max_iterations]
```

Por defecto son 10 iteraciones.

Ralph hará:
1. Crear una rama feature (desde PRD `branchName`)
2. Seleccionar la historia de mayor prioridad donde `passes: false`
3. Implementar esa única historia
4. Ejecutar verificaciones de calidad (typecheck, tests)
5. Commitear si las verificaciones pasan
6. Actualizar `prd.json` para marcar la historia como `passes: true`
7. Agregar aprendizajes a `progress.txt`
8. Repetir hasta que todas las historias pasen o se alcance el máximo de iteraciones

---

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `scripts/ralph/ralph.sh` | El loop bash que genera instancias frescas de Amp |
| `scripts/ralph/prompt.md` | Instrucciones dadas a cada instancia de Amp |
| `scripts/ralph/prd.json` | User stories con estado `passes` (la lista de tareas) |
| `scripts/ralph/prd.json.example` | Formato PRD de ejemplo para referencia |
| `scripts/ralph/progress.txt` | Aprendizajes append-only para futuras iteraciones |

---

## 🔍 Conceptos Críticos

### Cada Iteración = Contexto Fresco

Cada iteración genera una **nueva instancia de Amp** con contexto limpio. La única memoria entre iteraciones es:
- Git history (commits de iteraciones anteriores)
- `progress.txt` (aprendizajes y contexto)
- `prd.json` (qué historias están hechas)

### Tareas Pequeñas

Cada item del PRD debe ser lo suficientemente pequeño para completarse en una ventana de contexto. Si una tarea es muy grande, el LLM se queda sin contexto antes de terminar y produce código pobre.

**Historias bien dimensionadas:**
- Agregar una columna de base de datos y migración
- Agregar un componente UI a una página existente
- Actualizar una server action con nueva lógica
- Agregar un dropdown de filtro a una lista

**Muy grandes (dividir estas):**
- "Construir todo el dashboard"
- "Agregar autenticación"
- "Refactorizar la API"

### Actualizaciones de AGENTS.md Son Críticas

Después de cada iteración, Ralph actualiza los archivos `AGENTS.md` relevantes con aprendizajes. Esto es clave porque Amp lee automáticamente estos archivos, así que futuras iteraciones (y futuros desarrolladores humanos) se benefician de patrones descubiertos, gotchas, y convenciones.

### Loops de Feedback

Ralph solo funciona si hay loops de feedback:
- Typecheck captura errores de tipo
- Tests verifican comportamiento
- CI debe mantenerse verde (código roto se acumula entre iteraciones)

### Verificación en Navegador para Historias UI

Las historias de frontend deben incluir "Verify in browser using dev-browser skill" en los criterios de aceptación. Ralph usará el skill dev-browser para navegar a la página, interactuar con la UI, y confirmar que los cambios funcionan.

---

## 🐛 Debugging

Ver estado actual:

```bash
# Ver qué historias están hechas
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'

# Ver aprendizajes de iteraciones anteriores
cat scripts/ralph/progress.txt

# Ver historial de git
git log --oneline -10
```

---

## 📝 Personalizar prompt.md

Edita `scripts/ralph/prompt.md` para personalizar el comportamiento de Ralph para tu proyecto:
- Agregar comandos de verificación de calidad específicos del proyecto
- Incluir convenciones del codebase
- Agregar gotchas comunes para tu stack

---

## 🔗 Referencias

- [Artículo de Geoffrey Huntley sobre Ralph](https://ghuntley.com/ralph/)
- [Documentación de Amp](https://ampcode.com/manual)
- [Flowchart interactivo de Ralph](https://snarktank.github.io/ralph/)

---

## ✅ Checklist de Configuración

- [x] Archivos copiados a `scripts/ralph/`
- [x] Skills instaladas globalmente
- [x] Configuración de Amp creada/actualizada
- [ ] **PENDIENTE:** Instalar `jq` (ver sección Prerequisitos Pendientes)
- [ ] Crear primer PRD usando skill `prd`
- [ ] Convertir PRD a `prd.json` usando skill `ralph`
- [ ] Ejecutar primera iteración de Ralph

---

## 🚀 Próximos Pasos

1. **Instalar jq** (ver sección Prerequisitos Pendientes)
2. **Crear tu primer PRD:**
   ```
   Load the prd skill and create a PRD for [tu feature]
   ```
3. **Convertir a formato Ralph:**
   ```
   Load the ralph skill and convert tasks/prd-[feature-name].md to scripts/ralph/prd.json
   ```
4. **Ejecutar Ralph:**
   ```bash
   ./scripts/ralph/ralph.sh
   ```

---

## 💡 Tips

- **Empieza pequeño:** Crea un PRD con 2-3 historias pequeñas para probar el flujo
- **Revisa progress.txt:** Después de cada iteración, revisa qué aprendió Ralph
- **Mantén CI verde:** Si una iteración rompe algo, arréglalo antes de continuar
- **Divide historias grandes:** Si una historia es muy grande, divídela en múltiples historias más pequeñas

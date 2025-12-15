# 🧠 Plan de Integración IA + Notion para Análisis de Documentación y Métricas

## 🎯 Objetivo

Usar IA para analizar documentación de Notion asociada a iniciativas, extraer métricas automáticamente y sincronizar datos estructurados con la base de datos.

## 📋 Arquitectura Propuesta

```
┌─────────────────┐
│  Notion Pages   │ (Documentación por iniciativa)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Notion API     │ (Obtener contenido de páginas)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Service     │ (Self-Hosted/Private)
│  - Analizar docs│ (Ollama/Local LLM)
│  - Extraer info │ (Supabase Edge Function)
│  - Calcular mets│ (No data leaves infrastructure)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Data Processor │ (Estructurar y validar)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Supabase DB    │ (Almacenar métricas y metadata)
└─────────────────┘
```

## 🔧 Componentes a Desarrollar

### 1. **AI Analysis Service** (`src/services/aiNotionService.js`)

**Responsabilidades:**
- Conectar con IA privada/self-hosted (Ollama, Supabase Edge Function)
- Analizar contenido de páginas de Notion
- **TODOS los datos permanecen en infraestructura privada**
- Extraer información estructurada:
  - Métricas de progreso
  - Estado actual
  - Bloqueos/riesgos
  - Dependencias
  - Estimaciones vs Realidad
  - Comentarios clave

**Arquitectura Privada:**
- Opción 1: Supabase Edge Function con modelo local
- Opción 2: Ollama self-hosted (Llama 2, Mistral, etc.)
- Opción 3: Servidor privado con API interna

**Estructura:**
```javascript
{
  initiative: "Strata Public API",
  analysis: {
    status: "in_progress",
    completion: 30,
    metrics: {
      tasksCompleted: 5,
      tasksTotal: 15,
      storyPointsDone: 8,
      storyPointsTotal: 40,
      blockers: ["Waiting for API design approval"],
      risks: ["Timeline at risk due to dependencies"]
    },
    extractedData: {
      startDate: "2025-10-27",
      expectedDelivery: "2025-12-19",
      team: "Core Infrastructure",
      dependencies: ["DataLake", "Kibana"]
    },
    confidence: 0.85
  }
}
```

### 2. **Notion Content Extractor** (`src/services/notionContentExtractor.js`)

**Responsabilidades:**
- Obtener contenido completo de páginas de Notion
- Extraer texto de bloques (párrafos, listas, tablas)
- Obtener propiedades estructuradas
- Manejar documentos anidados/subpáginas
- Cachear contenido para evitar llamadas repetidas

**Funciones clave:**
- `getPageContent(pageId)` - Obtener todo el contenido
- `extractTextBlocks(blocks)` - Extraer texto estructurado
- `getRelatedPages(pageId)` - Obtener páginas relacionadas
- `searchByInitiativeName(name)` - Buscar por nombre de iniciativa

### 3. **AI Prompt Engineering** (`src/services/aiPrompts.js`)

**Prompts especializados:**
- **Métricas Extraction Prompt**: Extraer números, porcentajes, fechas
- **Status Detection Prompt**: Identificar estado (in_progress, blocked, done)
- **Risk Analysis Prompt**: Detectar riesgos y bloqueos
- **Dependency Mapping Prompt**: Identificar dependencias entre iniciativas

**Ejemplo de prompt:**
```javascript
const METRICS_EXTRACTION_PROMPT = `
Analiza la siguiente documentación de Notion para la iniciativa "{initiativeName}".

Extrae y estructura la siguiente información:
1. Estado actual (in_progress, blocked, done, planned)
2. Porcentaje de completación (0-100)
3. Métricas cuantitativas:
   - Tareas completadas vs totales
   - Story points completados vs totales
   - Días trabajados vs estimados
4. Bloqueos o riesgos mencionados
5. Dependencias con otras iniciativas
6. Fechas clave (inicio, entrega esperada, hitos)

Documentación:
{content}

Responde en formato JSON estructurado.
`;
```

### 4. **Database Sync Service** (`src/services/notionAiSyncService.js`)

**Responsabilidades:**
- Sincronizar análisis de IA con Supabase
- Crear/actualizar registros de métricas
- Mantener historial de análisis
- Detectar cambios y actualizar solo lo necesario

**Tablas en Supabase:**
```sql
-- Tabla para almacenar análisis de IA
CREATE TABLE notion_ai_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  notion_page_id VARCHAR(255),
  analysis_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(50),
  completion_percentage INTEGER,
  metrics JSONB,
  extracted_data JSONB,
  confidence_score DECIMAL(3,2),
  raw_content TEXT,
  ai_model VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para historial de métricas
CREATE TABLE initiative_metrics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  metric_date DATE NOT NULL,
  completion_percentage INTEGER,
  tasks_completed INTEGER,
  tasks_total INTEGER,
  story_points_done INTEGER,
  story_points_total INTEGER,
  blockers_count INTEGER,
  source VARCHAR(50), -- 'ai_analysis', 'jira', 'notion', 'manual'
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. **Scheduled Sync Job** (`scripts/sync-notion-ai.js`)

**Responsabilidades:**
- Ejecutar análisis periódico (cron job)
- Procesar todas las iniciativas activas
- Actualizar base de datos
- Enviar notificaciones si hay cambios significativos

**Flujo:**
1. Obtener lista de iniciativas desde Google Sheets/CSV
2. Para cada iniciativa:
   - Buscar página en Notion
   - Extraer contenido
   - Enviar a IA para análisis
   - Procesar respuesta
   - Guardar en Supabase
3. Generar reporte de sincronización

## 🚀 Plan de Implementación

### Fase 1: Setup y Configuración (Día 1-2)

1. **Configurar IA Privada**
   - **Opción A**: Setup Ollama (recomendado)
     - Instalar Ollama: https://ollama.ai
     - Descargar modelo: `ollama pull llama2:13b`
     - Verificar: `ollama list`
   - **Opción B**: Crear Supabase Edge Function
     - Función que procesa análisis localmente
     - No expone datos a APIs externas
   - **Opción C**: Servidor privado interno
     - Setup de servidor con GPU (opcional)
     - API REST interna
   - Configurar variables de entorno
   - Crear servicio base de conexión

2. **Mejorar Notion Integration**
   - Extender `notionApi.js` para obtener contenido completo
   - Implementar extracción de bloques de texto
   - Agregar soporte para búsqueda avanzada

3. **Crear Tablas en Supabase**
   - Ejecutar migraciones SQL
   - Configurar índices
   - Setup de RLS (Row Level Security)

### Fase 2: AI Service Core (Día 3-4)

1. **Desarrollar AI Service**
   - Implementar conexión con API de IA
   - Crear prompts especializados
   - Implementar parsing de respuestas JSON
   - Manejo de errores y retries

2. **Content Extractor**
   - Implementar extracción de contenido de Notion
   - Manejar diferentes tipos de bloques
   - Cachear contenido

3. **Testing**
   - Probar con iniciativas reales
   - Validar extracción de métricas
   - Ajustar prompts según resultados

### Fase 3: Database Integration (Día 5)

1. **Sync Service**
   - Implementar sincronización con Supabase
   - Crear/actualizar registros
   - Manejar conflictos

2. **Historial de Métricas**
   - Implementar tracking de cambios
   - Almacenar historial temporal

### Fase 4: Automation (Día 6)

1. **Scheduled Job**
   - Crear script de sincronización
   - Configurar ejecución periódica (GitHub Actions, cron, etc.)
   - Implementar logging y monitoreo

2. **Dashboard Integration**
   - Conectar análisis de IA con vista de Strata Mapping
   - Mostrar métricas extraídas
   - Indicadores de confianza

### Fase 5: Refinamiento (Día 7+)

1. **Mejoras de Prompts**
   - Ajustar según feedback
   - Agregar validaciones
   - Mejorar precisión

2. **Optimización**
   - Cache inteligente
   - Procesamiento en batch
   - Rate limiting

## 📊 Métricas a Extraer

### Métricas Cuantitativas
- **Completación**: Porcentaje (0-100)
- **Tareas**: Completadas vs Totales
- **Story Points**: Completados vs Totales
- **Tiempo**: Trabajado vs Estimado
- **Velocidad**: Story points por sprint

### Métricas Cualitativas
- **Estado**: in_progress, blocked, done, planned
- **Bloqueos**: Lista de bloqueos identificados
- **Riesgos**: Riesgos detectados
- **Dependencias**: Iniciativas relacionadas

### Metadata
- **Confianza**: Score de confianza del análisis (0-1)
- **Fuente**: Origen de los datos
- **Última actualización**: Timestamp
- **Modelo usado**: Versión de IA utilizada

## 🔐 Configuración Requerida

### Variables de Entorno
```env
# AI Service (PRIVADA - Self-hosted)
# Opción 1: Ollama local
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2:13b  # o mistral, codellama, etc.

# Opción 2: Supabase Edge Function (privada)
AI_EDGE_FUNCTION_URL=https://[project].supabase.co/functions/v1/analyze-notion
# La función corre en Supabase, datos nunca salen

# Opción 3: Servidor privado interno
PRIVATE_AI_API_URL=http://internal-ai-server:8080
PRIVATE_AI_API_KEY=...

# Notion
NOTION_API_TOKEN=secret_...
NOTION_DATABASE_ID=...

# Supabase
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Dependencias NPM
```json
{
  // Opción 1: Ollama (self-hosted)
  "ollama": "^0.5.0",
  
  // Opción 2: Cliente HTTP genérico para API privada
  "axios": "^1.6.0",
  
  "@supabase/supabase-js": "^2.87.1"
}
```

### Opciones de IA Privada

#### Opción 1: Ollama (Recomendado para desarrollo)
- **Ventajas**: Fácil setup, modelos open-source, completamente local
- **Modelos recomendados**: 
  - `llama2:13b` - Buen balance calidad/velocidad
  - `mistral:7b` - Más rápido, buena calidad
  - `codellama:13b` - Mejor para análisis técnico
- **Setup**: `docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama`
- **Datos**: 100% privados, nunca salen de tu infraestructura

#### Opción 2: Supabase Edge Function
- **Ventajas**: Integrado con Supabase, fácil deployment
- **Implementación**: Edge Function que usa modelo local o llama a Ollama
- **Datos**: Permanecen en Supabase, no se exponen

#### Opción 3: Servidor Privado Interno
- **Ventajas**: Control total, puede usar GPU dedicado
- **Implementación**: API REST interna con modelo self-hosted
- **Datos**: Completamente aislados en red privada

## 💡 Ejemplo de Uso

```javascript
import { analyzeInitiativeWithAI } from './services/aiNotionService';
import { syncToDatabase } from './services/notionAiSyncService';

// Analizar una iniciativa
const result = await analyzeInitiativeWithAI({
  initiativeName: "Strata Public API",
  notionPageId: "abc123",
  useCache: true
});

// Sincronizar con base de datos
await syncToDatabase(result);

// Resultado:
{
  initiative: "Strata Public API",
  analysis: {
    status: "in_progress",
    completion: 30,
    metrics: {
      tasksCompleted: 5,
      tasksTotal: 15,
      storyPointsDone: 8,
      storyPointsTotal: 40
    },
    confidence: 0.85
  },
  synced: true,
  syncedAt: "2025-01-13T10:30:00Z"
}
```

## 🎯 Próximos Pasos Inmediatos

1. **Decidir solución de IA privada**
   - **Ollama** (recomendado): Más fácil, modelos open-source
   - **Supabase Edge Function**: Integrado, pero requiere más setup
   - **Servidor privado**: Máximo control, requiere infraestructura

2. **Setup de IA privada**
   - Si Ollama: Instalar y descargar modelo
   - Si Edge Function: Crear función en Supabase
   - Si servidor privado: Configurar servidor y API

3. **Crear estructura base**
   - Crear servicios mencionados
   - Setup de configuración
   - Testing inicial con datos de prueba

## 📝 Notas Importantes

- **🔒 PRIVACIDAD**: TODOS los datos permanecen en infraestructura privada
  - No se envían datos a APIs públicas (OpenAI, Claude, etc.)
  - Análisis se ejecuta localmente o en Supabase Edge Function
  - Documentación de Notion nunca sale de tu control
  
- **Rendimiento**: Modelos self-hosted pueden ser más lentos que APIs públicas
  - Considerar cache agresivo
  - Procesar en batch cuando sea posible
  - Usar modelos más pequeños para análisis rápidos
  
- **Validación**: Siempre validar respuestas de IA antes de guardar
  - Los modelos locales pueden tener menor precisión
  - Implementar validación de esquema JSON
  - Fallback a datos estructurados de Notion si IA falla
  
- **Fallback**: Tener plan B si IA falla
  - Usar datos estructurados de Notion directamente
  - Análisis manual como última opción
  
- **Seguridad de Datos**:
  - ✅ Datos procesados localmente
  - ✅ No hay data leak a terceros
  - ✅ Control total sobre información sensible
  - ✅ Cumple con requisitos de privacidad estrictos

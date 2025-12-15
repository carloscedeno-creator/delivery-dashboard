# 📊 Plan de Extracción de Datos de Notion

## 🎯 Objetivo

Extraer y estructurar datos de documentación de Notion asociada a iniciativas, sin usar IA, y sincronizar con Supabase.

## 📋 Arquitectura

```
Notion Pages (Documentación)
    ↓
Notion API (Obtener contenido)
    ↓
Content Extractor (Extraer texto estructurado)
    ↓
Data Processor (Estructurar y validar)
    ↓
Supabase DB (Almacenar datos extraídos)
```

## 🔧 Componentes a Desarrollar

### 1. **Notion Content Extractor** (`src/services/notionContentExtractor.js`)

**Responsabilidades:**
- Obtener contenido completo de páginas de Notion
- Extraer texto de todos los bloques (párrafos, listas, tablas, etc.)
- Manejar diferentes tipos de bloques
- Extraer propiedades estructuradas
- Manejar documentos anidados/subpáginas

**Funciones clave:**
- `getPageContent(pageId)` - Obtener todo el contenido de una página
- `extractTextBlocks(blocks)` - Extraer texto estructurado de bloques
- `extractProperties(page)` - Extraer propiedades de la página
- `searchByInitiativeName(name)` - Buscar páginas por nombre de iniciativa
- `getRelatedPages(pageId)` - Obtener páginas relacionadas/subpáginas

### 2. **Data Structure Service** (`src/services/notionDataProcessor.js`)

**Responsabilidades:**
- Procesar contenido extraído
- Identificar métricas en el texto (porcentajes, números, fechas)
- Extraer información estructurada usando regex y parsing
- Validar y normalizar datos
- Detectar estados, bloqueos, dependencias

**Extracción basada en patrones:**
- **Porcentajes**: Buscar "30%", "completado: 30%", etc.
- **Tareas**: Buscar checkboxes, listas con [x] o [ ]
- **Story Points**: Buscar "5 SP", "story points: 8", etc.
- **Fechas**: Extraer fechas mencionadas
- **Estados**: Identificar palabras clave (in_progress, blocked, done)
- **Bloqueos**: Buscar secciones de "blockers", "risks", etc.
- **Dependencias**: Identificar referencias a otras iniciativas

### 3. **Supabase Sync Service** (`src/services/notionSupabaseSync.js`)

**Responsabilidades:**
- Sincronizar datos extraídos con Supabase
- Crear/actualizar registros
- Mantener historial de extracciones
- Detectar cambios y actualizar solo lo necesario

**Tablas en Supabase:**
```sql
-- Tabla para almacenar contenido extraído de Notion
CREATE TABLE notion_content_extraction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  notion_page_id VARCHAR(255) UNIQUE,
  page_url TEXT,
  extracted_content TEXT,
  structured_data JSONB,
  properties JSONB,
  extraction_date TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para métricas extraídas
CREATE TABLE notion_extracted_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_name VARCHAR(255) NOT NULL,
  extraction_date DATE NOT NULL,
  status VARCHAR(50),
  completion_percentage INTEGER,
  tasks_completed INTEGER,
  tasks_total INTEGER,
  story_points_done INTEGER,
  story_points_total INTEGER,
  blockers JSONB, -- Array de bloqueos encontrados
  dependencies JSONB, -- Array de dependencias
  extracted_dates JSONB, -- Fechas extraídas (start, delivery, etc.)
  raw_metrics JSONB, -- Todas las métricas en formato JSON
  source VARCHAR(50) DEFAULT 'notion_extraction',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_notion_content_initiative ON notion_content_extraction(initiative_name);
CREATE INDEX idx_notion_content_page_id ON notion_content_extraction(notion_page_id);
CREATE INDEX idx_notion_metrics_initiative ON notion_extracted_metrics(initiative_name);
CREATE INDEX idx_notion_metrics_date ON notion_extracted_metrics(extraction_date);
```

### 4. **Scheduled Sync Script** (`scripts/sync-notion-data.js`)

**Responsabilidades:**
- Ejecutar extracción periódica
- Procesar todas las iniciativas activas
- Actualizar base de datos
- Generar reportes de sincronización

**Flujo:**
1. Obtener lista de iniciativas desde Google Sheets/CSV
2. Para cada iniciativa:
   - Buscar página en Notion
   - Extraer contenido completo
   - Procesar y estructurar datos
   - Extraer métricas usando patrones
   - Guardar en Supabase
3. Generar reporte de sincronización

## 🚀 Plan de Implementación

### Fase 1: Content Extractor (Día 1-2)

1. **Extender Notion API**
   - Implementar `getPageBlocks(pageId)` para obtener bloques
   - Implementar `extractTextFromBlocks(blocks)` para extraer texto
   - Manejar diferentes tipos de bloques (paragraph, heading, list, table, etc.)

2. **Crear Content Extractor Service**
   - Función para obtener contenido completo
   - Función para extraer texto estructurado
   - Función para buscar páginas por iniciativa

### Fase 2: Data Processor (Día 2-3)

1. **Implementar Extracción de Patrones**
   - Regex para porcentajes
   - Detección de tareas (checkboxes, listas)
   - Extracción de story points
   - Detección de fechas
   - Identificación de estados
   - Extracción de bloqueos y riesgos
   - Detección de dependencias

2. **Validación y Normalización**
   - Validar datos extraídos
   - Normalizar formatos
   - Manejar casos edge

### Fase 3: Database Integration (Día 3-4)

1. **Crear Tablas en Supabase**
   - Ejecutar migraciones SQL
   - Configurar índices
   - Setup de RLS

2. **Sync Service**
   - Implementar sincronización
   - Crear/actualizar registros
   - Manejar conflictos

### Fase 4: Automation (Día 4-5)

1. **Scheduled Script**
   - Crear script de sincronización
   - Configurar ejecución periódica
   - Implementar logging

2. **Dashboard Integration**
   - Mostrar datos extraídos en Strata Mapping
   - Indicadores de última actualización
   - Comparar con datos de CSV

## 📊 Datos a Extraer

### Contenido Completo
- **Texto completo**: Todo el texto de la página
- **Estructura**: Headings, listas, tablas
- **Propiedades**: Todas las propiedades de Notion

### Métricas Extraídas (usando patrones)

#### Cuantitativas
- **Completación**: Porcentaje encontrado en texto
- **Tareas**: Completadas vs Totales (de checkboxes/listas)
- **Story Points**: Completados vs Totales
- **Fechas**: Inicio, entrega esperada, hitos

#### Cualitativas
- **Estado**: Detectado de texto o propiedades
- **Bloqueos**: Lista extraída de secciones de bloqueos
- **Riesgos**: Riesgos mencionados
- **Dependencias**: Referencias a otras iniciativas

### Metadata
- **Última actualización**: Timestamp de extracción
- **Fuente**: Notion page ID y URL
- **Confianza**: Score basado en qué tan estructurados están los datos

## 🔍 Patrones de Extracción

### Porcentajes
```javascript
// Buscar: "30%", "completado: 30%", "progress: 30%", etc.
const percentagePattern = /(\d+)%\s*(?:complet|progress|done|complete)/gi;
```

### Tareas
```javascript
// Buscar: [x], [ ], ✅, ☐, etc.
const taskPattern = /\[([x\s])\]\s*(.+)/gi;
```

### Story Points
```javascript
// Buscar: "5 SP", "story points: 8", "8 points", etc.
const storyPointsPattern = /(\d+)\s*(?:SP|story\s*points?|points?)/gi;
```

### Estados
```javascript
// Buscar palabras clave
const statusKeywords = {
  'in_progress': ['en progreso', 'in progress', 'working', 'activo'],
  'blocked': ['bloqueado', 'blocked', 'stuck', 'waiting'],
  'done': ['completado', 'done', 'finished', 'terminado'],
  'planned': ['planificado', 'planned', 'pending', 'pendiente']
};
```

### Fechas
```javascript
// Buscar fechas en diferentes formatos
const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/g;
```

## 💡 Ejemplo de Uso

```javascript
import { extractNotionData } from './services/notionContentExtractor';
import { processExtractedData } from './services/notionDataProcessor';
import { syncToSupabase } from './services/notionSupabaseSync';

// Extraer datos de una iniciativa
const initiativeName = "Strata Public API";

// 1. Buscar página en Notion
const pages = await searchPagesByInitiative(initiativeName);
if (pages.length === 0) {
  console.log('No se encontró página para esta iniciativa');
  return;
}

// 2. Extraer contenido completo
const pageId = pages[0].id;
const content = await extractNotionData(pageId);

// 3. Procesar y extraer métricas
const processed = processExtractedData(content, initiativeName);

// 4. Sincronizar con Supabase
await syncToSupabase(processed);

// Resultado:
{
  initiative: "Strata Public API",
  notionPageId: "abc123",
  content: "Texto completo extraído...",
  metrics: {
    status: "in_progress",
    completion: 30,
    tasksCompleted: 5,
    tasksTotal: 15,
    storyPointsDone: 8,
    storyPointsTotal: 40,
    blockers: ["Waiting for API design approval"],
    dependencies: ["DataLake"]
  },
  extractedData: {
    startDate: "2025-10-27",
    expectedDelivery: "2025-12-19"
  },
  synced: true
}
```

## 🎯 Próximos Pasos Inmediatos

1. **Mejorar Notion API Integration**
   - Implementar obtención de bloques
   - Extracción de texto estructurado

2. **Crear Content Extractor**
   - Servicio para extraer contenido completo
   - Manejo de diferentes tipos de bloques

3. **Implementar Data Processor**
   - Patrones de extracción
   - Validación y normalización

4. **Crear Tablas en Supabase**
   - Migraciones SQL
   - Configuración de índices

5. **Sync Service**
   - Sincronización con Supabase
   - Script de ejecución

# 🔒 Setup de IA Privada para Análisis de Notion

## 🎯 Objetivo

Configurar una solución de IA completamente privada que procese documentación de Notion sin exponer datos a APIs públicas.

## 🏗️ Opciones de Implementación para Nube (Supabase + GitHub Pages)

### Opción 1: Supabase Edge Function + VPS Privado con Ollama ⭐ (Recomendado)

**Arquitectura:**
```
GitHub Pages (Frontend)
    ↓
Supabase Edge Function (Backend privado)
    ↓
VPS/Servidor Privado con Ollama (IA privada)
```

**Ventajas:**
- ✅ Datos nunca salen de tu control
- ✅ Edge Function maneja la lógica
- ✅ Ollama en servidor privado (VPS, AWS EC2 privado, etc.)
- ✅ Escalable y profesional
- ✅ Completamente privado

**Setup:**

1. **Configurar VPS/Servidor Privado con Ollama:**
```bash
# En tu VPS (AWS EC2, DigitalOcean, etc.)
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar modelo
ollama pull llama2:13b

# Configurar para acceso desde Supabase (con autenticación)
# Usar nginx reverse proxy con autenticación básica
```

2. **Crear Supabase Edge Function:**
```typescript
// supabase/functions/analyze-notion/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OLLAMA_PRIVATE_URL = Deno.env.get('OLLAMA_PRIVATE_URL') // URL de tu VPS privado
const OLLAMA_API_KEY = Deno.env.get('OLLAMA_API_KEY') // API key para autenticación

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  try {
    const { content, initiativeName } = await req.json()
    
    // Llamar a Ollama en servidor privado
    const ollamaResponse = await fetch(`${OLLAMA_PRIVATE_URL}/api/generate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OLLAMA_API_KEY}` // Autenticación
      },
      body: JSON.stringify({
        model: 'llama2:13b',
        prompt: `Analiza esta documentación de Notion para la iniciativa "${initiativeName}".

Extrae y estructura la siguiente información en JSON:
{
  "status": "in_progress|blocked|done|planned",
  "completion": 0-100,
  "tasksCompleted": 0,
  "tasksTotal": 0,
  "storyPointsDone": 0,
  "storyPointsTotal": 0,
  "blockers": [],
  "dependencies": [],
  "risks": [],
  "extractedData": {
    "startDate": "",
    "expectedDelivery": "",
    "team": ""
  }
}

Documentación:
${content}

Responde SOLO con el JSON, sin texto adicional.`,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2000
        }
      })
    })

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama error: ${ollamaResponse.statusText}`)
    }

    const aiData = await ollamaResponse.json()
    
    // Parsear respuesta JSON
    let analysis
    try {
      analysis = JSON.parse(aiData.response)
    } catch (e) {
      // Intentar extraer JSON si está embebido en texto
      const jsonMatch = aiData.response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON response from AI')
      }
    }

    // Guardar en Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabase
      .from('notion_ai_analysis')
      .upsert({
        initiative_name: initiativeName,
        analysis_date: new Date().toISOString(),
        status: analysis.status,
        completion_percentage: analysis.completion,
        metrics: analysis,
        extracted_data: analysis.extractedData,
        confidence_score: 0.85,
        raw_content: content.substring(0, 10000), // Limitar tamaño
        ai_model: 'llama2:13b',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'initiative_name'
      })

    if (dbError) {
      console.error('DB error:', dbError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        synced: !dbError
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    )
  }
})
```

3. **Configurar Variables de Entorno en Supabase:**
```bash
# En Supabase Dashboard > Edge Functions > Settings > Secrets
OLLAMA_PRIVATE_URL=https://tu-vps-privado.com:11434
OLLAMA_API_KEY=tu-api-key-secreta
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Opción 2: Supabase Edge Function con Modelo Embedding Local

**Para análisis más simples sin necesidad de servidor externo:**
- Usar embeddings locales dentro de Supabase
- Análisis basado en reglas + embeddings
- Más limitado pero completamente dentro de Supabase

**Configuración en el proyecto:**

```javascript
// src/config/aiConfig.js
export const AI_CONFIG = {
  provider: 'ollama',
  baseUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'llama2:13b',
  timeout: 30000, // 30 segundos
  temperature: 0.3, // Más determinista para análisis
  maxTokens: 2000
};
```

### Opción 2: Supabase Edge Function con Análisis Basado en Reglas

**Para casos donde no necesitas IA completa:**
- Análisis de patrones con regex y reglas
- Extracción de métricas estructuradas
- Más rápido y económico
- Funciona completamente dentro de Supabase

**Implementación:**
```typescript
// Análisis basado en patrones sin IA externa
// Buscar porcentajes, estados, tareas completadas, etc.
// Usar expresiones regulares y parsing estructurado
```

### Opción 3: VPS Privado con API REST

**Arquitectura alternativa:**
```
GitHub Pages → Supabase Edge Function → VPS Privado (Ollama)
```

**Setup del VPS:**
```bash
# En VPS (DigitalOcean, AWS EC2, etc.)
# 1. Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama2:13b

# 2. Configurar nginx con autenticación
# 3. Exponer API REST protegida
# 4. Configurar firewall (solo permitir Supabase)
```

**Ventajas:**
- ✅ Control total
- ✅ Puede usar GPU dedicado
- ✅ Máxima seguridad
- ✅ Escalable

**Setup:**

```bash
# Servidor con GPU (opcional pero recomendado)
# Instalar CUDA, PyTorch, etc.
# Setup de API REST con FastAPI o similar
```

## 🔧 Integración en el Proyecto (Nube)

### 1. Crear Servicio de IA Privada (Frontend)

```javascript
// src/services/privateAiService.js
// Este servicio llama a Supabase Edge Function, que a su vez llama a Ollama privado

export class PrivateAIService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async analyzeInitiative(initiativeName, notionContent) {
    try {
      console.log(`[AI] Analyzing initiative: ${initiativeName}`);
      
      // Llamar a Supabase Edge Function
      // La Edge Function se conecta a Ollama privado
      const { data, error } = await this.supabase.functions.invoke('analyze-notion', {
        body: {
          initiativeName,
          content: notionContent
        }
      });

      if (error) {
        console.error('[AI] Edge Function error:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'AI analysis failed');
      }

      console.log(`[AI] Analysis completed for ${initiativeName}`);
      return data.analysis;

    } catch (error) {
      console.error('[AI] Error analyzing initiative:', error);
      throw error;
    }
  }

  async getAnalysisHistory(initiativeName) {
    try {
      const { data, error } = await this.supabase
        .from('notion_ai_analysis')
        .select('*')
        .eq('initiative_name', initiativeName)
        .order('analysis_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[AI] Error fetching history:', error);
      throw error;
    }
  }
}

// Uso en componentes
export const createAIService = (supabaseClient) => {
  return new PrivateAIService(supabaseClient);
};
```

### 2. Configuración para Nube

**En Supabase Dashboard (Edge Functions Secrets):**
```env
# Secrets de Edge Function (NO en .env del frontend)
OLLAMA_PRIVATE_URL=https://tu-vps-privado.com:11434
OLLAMA_API_KEY=tu-api-key-secreta-para-autenticacion
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key)
```

**En Frontend (.env.local - solo Supabase):**
```env
# Solo necesitas las keys de Supabase en el frontend
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon key)
```

**⚠️ IMPORTANTE:**
- Las credenciales de Ollama NUNCA van en el frontend
- Solo se configuran como secrets en Supabase Edge Functions
- El frontend solo llama a la Edge Function
- La Edge Function se conecta al VPS privado con Ollama

## 🧪 Testing

```javascript
// scripts/test-private-ai.js
import { privateAIService } from '../src/services/privateAiService.js';

const testContent = `
# Strata Public API

## Estado: En Progreso
## Completación: 30%

### Tareas
- [x] Diseño de API (5 SP)
- [x] Setup inicial (3 SP)
- [ ] Implementación endpoints (20 SP)
- [ ] Documentación (8 SP)
- [ ] Testing (4 SP)

### Bloqueos
- Esperando aprobación de diseño de API

### Dependencias
- DataLake debe estar completo
`;

const prompt = `
Analiza esta documentación y extrae:
1. Estado (in_progress, blocked, done, planned)
2. Porcentaje de completación (0-100)
3. Tareas completadas vs totales
4. Story points completados vs totales
5. Bloqueos mencionados
6. Dependencias

Responde en JSON:
{
  "status": "...",
  "completion": 0-100,
  "tasksCompleted": 0,
  "tasksTotal": 0,
  "storyPointsDone": 0,
  "storyPointsTotal": 0,
  "blockers": [],
  "dependencies": []
}
`;

async function test() {
  try {
    console.log('🧪 Testing private AI...');
    const result = await privateAIService.analyze(testContent, prompt);
    console.log('✅ Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();
```

## 🔒 Seguridad y Privacidad

### Checklist de Privacidad

- ✅ **Datos nunca salen de infraestructura privada**
- ✅ **No hay llamadas a APIs públicas de IA**
- ✅ **Modelos ejecutados localmente o en servidor privado**
- ✅ **Comunicación interna solamente**
- ✅ **Sin logging de datos sensibles en servicios externos**

### Recomendaciones

1. **Red Privada**: Si usas Ollama, asegúrate que esté en red privada
2. **Autenticación**: Proteger API de IA con autenticación
3. **Encriptación**: Usar HTTPS para comunicación interna
4. **Auditoría**: Logging de accesos sin contenido sensible
5. **Backup**: Backup de análisis sin exponer datos

## 📊 Comparación de Opciones

| Característica | Ollama | Edge Function | Servidor Privado |
|---------------|--------|---------------|------------------|
| Setup | ⭐⭐⭐⭐⭐ Fácil | ⭐⭐⭐ Medio | ⭐⭐ Complejo |
| Privacidad | ⭐⭐⭐⭐⭐ 100% | ⭐⭐⭐⭐⭐ 100% | ⭐⭐⭐⭐⭐ 100% |
| Rendimiento | ⭐⭐⭐ Bueno | ⭐⭐⭐⭐ Muy bueno | ⭐⭐⭐⭐⭐ Excelente |
| Costo | ⭐⭐⭐⭐⭐ Gratis | ⭐⭐⭐⭐ Bajo | ⭐⭐⭐ Medio |
| Escalabilidad | ⭐⭐⭐ Limitada | ⭐⭐⭐⭐ Buena | ⭐⭐⭐⭐⭐ Excelente |

## 🚀 Próximos Pasos

1. **Elegir opción** (recomendado: Ollama para empezar)
2. **Instalar y configurar**
3. **Probar con datos de ejemplo**
4. **Integrar con Notion service**
5. **Conectar con Supabase**

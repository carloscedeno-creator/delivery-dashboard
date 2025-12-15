# 🔒 Setup de IA Privada para Análisis de Notion

## 🎯 Objetivo

Configurar una solución de IA completamente privada que procese documentación de Notion sin exponer datos a APIs públicas.

## 🏗️ Opciones de Implementación

### Opción 1: Ollama (Recomendado) ⭐

**Ventajas:**
- ✅ Setup muy simple
- ✅ Modelos open-source gratuitos
- ✅ 100% local, datos nunca salen
- ✅ Buena calidad con modelos modernos
- ✅ No requiere GPU (aunque ayuda)

**Instalación:**

```bash
# Windows (usando WSL o Docker)
# Opción A: Docker
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Opción B: Instalador nativo
# Descargar de: https://ollama.ai/download

# Descargar modelo (recomendado para análisis)
ollama pull llama2:13b
# o más rápido pero menos preciso:
ollama pull mistral:7b
# o mejor para código/documentación técnica:
ollama pull codellama:13b

# Verificar
ollama list
ollama run llama2:13b "Hello, test"
```

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

### Opción 2: Supabase Edge Function

**Ventajas:**
- ✅ Integrado con Supabase
- ✅ Datos nunca salen de Supabase
- ✅ Puede usar Ollama interno o modelo local
- ✅ Fácil deployment

**Implementación:**

```typescript
// supabase/functions/analyze-notion/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Llamar a Ollama interno o procesar localmente
serve(async (req) => {
  const { content, initiativeName } = await req.json()
  
  // Llamar a Ollama (debe estar accesible desde Supabase)
  const ollamaResponse = await fetch('http://ollama:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2:13b',
      prompt: `Analiza esta documentación...\n\n${content}`,
      stream: false
    })
  })
  
  // Procesar respuesta y guardar en Supabase
  // ...
})
```

### Opción 3: Servidor Privado Interno

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

## 🔧 Integración en el Proyecto

### 1. Crear Servicio de IA Privada

```javascript
// src/services/privateAiService.js
import { AI_CONFIG } from '../config/aiConfig.js';

export class PrivateAIService {
  constructor() {
    this.baseUrl = AI_CONFIG.baseUrl;
    this.model = AI_CONFIG.model;
  }

  async analyze(content, prompt) {
    try {
      // Si es Ollama
      if (AI_CONFIG.provider === 'ollama') {
        return await this.analyzeWithOllama(content, prompt);
      }
      
      // Si es Edge Function
      if (AI_CONFIG.provider === 'edge-function') {
        return await this.analyzeWithEdgeFunction(content, prompt);
      }
      
      throw new Error('AI provider not configured');
    } catch (error) {
      console.error('[AI] Error analyzing:', error);
      throw error;
    }
  }

  async analyzeWithOllama(content, prompt) {
    const fullPrompt = `${prompt}\n\nDocumentación:\n${content}\n\nResponde en formato JSON válido.`;
    
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2000
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parsear respuesta JSON
    try {
      return JSON.parse(data.response);
    } catch (e) {
      // Si no es JSON válido, intentar extraerlo
      const jsonMatch = data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Invalid JSON response from AI');
    }
  }

  async analyzeWithEdgeFunction(content, prompt) {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.functions.invoke('analyze-notion', {
      body: { content, prompt, initiativeName }
    });

    if (error) throw error;
    return data;
  }
}

export const privateAIService = new PrivateAIService();
```

### 2. Configuración de Variables de Entorno

```env
# .env.local
# Opción Ollama
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2:13b

# Opción Edge Function
AI_EDGE_FUNCTION_URL=https://[project].supabase.co/functions/v1/analyze-notion

# Configuración general
AI_PROVIDER=ollama  # 'ollama', 'edge-function', o 'private-server'
```

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

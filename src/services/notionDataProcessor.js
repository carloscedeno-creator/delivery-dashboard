/**
 * Procesador de datos extraídos de Notion
 * Extrae métricas e información estructurada usando patrones y regex
 * (Sin usar IA)
 */

/**
 * Extrae porcentaje de completación del texto
 * @param {string} text - Texto a analizar
 * @returns {number|null} Porcentaje encontrado (0-100) o null
 */
export const extractCompletionPercentage = (text) => {
  if (!text) return null;

  // Patrones para buscar porcentajes
  const patterns = [
    /(?:complet|progress|done|complete|avance).*?(\d+)%/gi,
    /(\d+)%.*?(?:complet|progress|done|complete)/gi,
    /completion.*?(\d+)/gi,
    /(\d+)\s*%\s*complete/gi
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const percentage = parseInt(matches[0].match(/\d+/)?.[0] || '0');
      if (percentage >= 0 && percentage <= 100) {
        return percentage;
      }
    }
  }

  return null;
};

/**
 * Extrae tareas (todos) del contenido estructurado
 * @param {Object} structuredContent - Contenido estructurado de Notion
 * @returns {Object} Tareas completadas y totales
 */
export const extractTasks = (structuredContent) => {
  if (!structuredContent || !structuredContent.todos) {
    return { completed: 0, total: 0, tasks: [] };
  }

  const todos = structuredContent.todos || [];
  const completed = todos.filter(t => t.checked).length;
  const total = todos.length;

  return {
    completed,
    total,
    tasks: todos
  };
};

/**
 * Extrae story points del texto o propiedades
 * @param {string} text - Texto a analizar
 * @param {Object} properties - Propiedades de Notion
 * @returns {Object} Story points completados y totales
 */
export const extractStoryPoints = (text, properties = {}) => {
  // Primero intentar desde propiedades de Notion (diferentes nombres posibles)
  const storyPointsProperty = properties['Story Points'] || 
                              properties['Story point estimate'] ||
                              properties['story_points'] ||
                              properties.storyPoints ||
                              null;
  
  if (storyPointsProperty !== null && storyPointsProperty !== undefined) {
    let points = 0;
    
    if (typeof storyPointsProperty === 'number') {
      points = storyPointsProperty;
    } else if (typeof storyPointsProperty === 'string') {
      points = parseInt(storyPointsProperty) || 0;
    } else if (typeof storyPointsProperty === 'object' && storyPointsProperty.value) {
      points = parseInt(storyPointsProperty.value) || 0;
    }
    
    if (points > 0) {
      // Calcular completados basado en completion percentage
      const completion = extractCompletionPercentage(text) || 
                        (properties.completion || properties.Completion || 0);
      
      return {
        done: Math.round((points * completion) / 100),
        total: points
      };
    }
  }
  
  if (!text) return { done: 0, total: 0 };

  // Buscar patrones de story points
  const patterns = [
    /(\d+)\s*(?:SP|story\s*points?|points?)/gi,
    /story\s*points?.*?(\d+)/gi
  ];

  const foundPoints = [];
  
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const points = parseInt(match[1] || '0');
      if (points > 0) {
        foundPoints.push(points);
      }
    });
  }

  // Si hay tareas con story points, sumarlos
  const taskPointsPattern = /\[([x\s])\]\s*.*?\((\d+)\s*SP\)/gi;
  let donePoints = 0;
  let totalPoints = 0;

  const taskMatches = [...text.matchAll(taskPointsPattern)];
  taskMatches.forEach(match => {
    const isDone = match[1].trim() === 'x';
    const points = parseInt(match[2] || '0');
    totalPoints += points;
    if (isDone) {
      donePoints += points;
    }
  });

  // Si no hay tareas con SP, usar los encontrados directamente
  if (totalPoints === 0 && foundPoints.length > 0) {
    totalPoints = Math.max(...foundPoints);
    // Estimar completados basado en porcentaje si está disponible
    const completion = extractCompletionPercentage(text);
    if (completion !== null) {
      donePoints = Math.round((totalPoints * completion) / 100);
    }
  }

  return {
    done: donePoints,
    total: totalPoints
  };
};

/**
 * Detecta el estado de la iniciativa
 * @param {string} text - Texto a analizar
 * @param {Object} properties - Propiedades de Notion
 * @returns {string} Estado detectado
 */
export const detectStatus = (text, properties = {}) => {
  // Primero verificar propiedades de Notion (diferentes nombres posibles)
  const statusProperty = properties.Status || 
                         properties.status || 
                         properties.Estado || 
                         properties.estado ||
                         properties['Task name']?.status ||
                         null;
  
  if (statusProperty) {
    const statusValue = typeof statusProperty === 'object' 
      ? statusProperty.name || statusProperty.value || statusProperty
      : statusProperty;
    
    const statusMap = {
      'Not Started': 'planned',
      'In Progress': 'in_progress',
      'Done': 'done',
      'Blocked': 'blocked',
      'On Hold': 'blocked',
      'Review': 'in_progress',
      'To Do': 'planned',
      'In Review': 'in_progress',
      'Completed': 'done',
      'Cancelled': 'cancelled'
    };
    
    const normalizedStatus = statusValue?.toString().trim();
    if (statusMap[normalizedStatus]) {
      return statusMap[normalizedStatus];
    }
    
    // Si es un objeto con name
    if (typeof statusProperty === 'object' && statusProperty.name) {
      return statusMap[statusProperty.name] || statusProperty.name.toLowerCase().replace(/\s+/g, '_');
    }
    
    return normalizedStatus?.toLowerCase().replace(/\s+/g, '_') || 'planned';
  }

  // Buscar en el texto
  const textLower = text.toLowerCase();
  
  const statusKeywords = {
    'in_progress': ['en progreso', 'in progress', 'working', 'activo', 'desarrollo', 'development'],
    'blocked': ['bloqueado', 'blocked', 'stuck', 'waiting', 'esperando', 'pendiente de'],
    'done': ['completado', 'done', 'finished', 'terminado', 'finalizado', 'complete'],
    'planned': ['planificado', 'planned', 'pending', 'pendiente', 'por hacer']
  };

  for (const [status, keywords] of Object.entries(statusKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return status;
    }
  }

  // Default basado en completación
  const completion = extractCompletionPercentage(text);
  if (completion === null) return 'planned';
  if (completion >= 100) return 'done';
  if (completion > 0) return 'in_progress';
  return 'planned';
};

/**
 * Extrae bloqueos mencionados en el texto
 * @param {string} text - Texto a analizar
 * @returns {Array<string>} Lista de bloqueos encontrados
 */
export const extractBlockers = (text) => {
  if (!text) return [];

  const blockers = [];
  const textLower = text.toLowerCase();

  // Buscar secciones de bloqueos
  const blockerSections = [
    /blockers?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis,
    /bloqueos?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis,
    /risks?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis,
    /riesgos?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis
  ];

  blockerSections.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const section = match[1];
      // Extraer items de lista
      const items = section.split(/\n/).filter(line => line.trim().length > 0);
      items.forEach(item => {
        const cleanItem = item.replace(/^[-*•]\s*/, '').replace(/^\[[x\s]\]\s*/, '').trim();
        if (cleanItem.length > 10) { // Filtrar items muy cortos
          blockers.push(cleanItem);
        }
      });
    });
  });

  // Buscar frases que indiquen bloqueos
  const blockerPhrases = [
    /(?:waiting|esperando|pendiente|blocked|bloqueado).*?(?:for|por|de)\s+([^.\n]+)/gi,
    /(?:cannot|cannot|no puede|no se puede).*?because.*?([^.\n]+)/gi
  ];

  blockerPhrases.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const blocker = match[1]?.trim();
      if (blocker && blocker.length > 5) {
        blockers.push(blocker);
      }
    });
  });

  return [...new Set(blockers)]; // Eliminar duplicados
};

/**
 * Extrae dependencias mencionadas
 * @param {string} text - Texto a analizar
 * @param {Array<string>} knownInitiatives - Lista de iniciativas conocidas
 * @returns {Array<string>} Lista de dependencias encontradas
 */
export const extractDependencies = (text, knownInitiatives = []) => {
  if (!text) return [];

  const dependencies = [];
  const textLower = text.toLowerCase();

  // Buscar sección de dependencias
  const depSections = [
    /dependencies?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis,
    /dependencias?[:\-]?\s*\n(.*?)(?=\n\n|\n[A-Z]|$)/gis
  ];

  depSections.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const section = match[1];
      const items = section.split(/\n/).filter(line => line.trim().length > 0);
      items.forEach(item => {
        const cleanItem = item.replace(/^[-*•]\s*/, '').trim();
        dependencies.push(cleanItem);
      });
    });
  });

  // Buscar referencias a iniciativas conocidas
  knownInitiatives.forEach(initiative => {
    const initiativeLower = initiative.toLowerCase();
    if (textLower.includes(initiativeLower) && !dependencies.includes(initiative)) {
      // Verificar que no sea el nombre de la iniciativa actual
      const context = textLower.substring(
        Math.max(0, textLower.indexOf(initiativeLower) - 50),
        Math.min(textLower.length, textLower.indexOf(initiativeLower) + 50)
      );
      
      // Si aparece en contexto de dependencia
      if (context.includes('depend') || context.includes('requir') || context.includes('need')) {
        dependencies.push(initiative);
      }
    }
  });

  return [...new Set(dependencies)];
};

/**
 * Extrae fechas del texto
 * @param {string} text - Texto a analizar
 * @returns {Object} Fechas extraídas
 */
export const extractDates = (text) => {
  if (!text) return {};

  const dates = {};
  
  // Patrones de fechas
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
    /(\d{1,2}-\d{1,2}-\d{4})/g
  ];

  const foundDates = [];
  datePatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      foundDates.push(match[1]);
    });
  });

  // Buscar fechas con contexto
  const startDatePattern = /(?:start|inicio|begin).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/gi;
  const deliveryDatePattern = /(?:delivery|entrega|expected|esperado).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/gi;
  const endDatePattern = /(?:end|fin|final).*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2})/gi;

  const startMatch = text.match(startDatePattern);
  if (startMatch) {
    dates.startDate = startMatch[0].match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/)?.[0];
  }

  const deliveryMatch = text.match(deliveryDatePattern);
  if (deliveryMatch) {
    dates.expectedDelivery = deliveryMatch[0].match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/)?.[0];
  }

  const endMatch = text.match(endDatePattern);
  if (endMatch) {
    dates.endDate = endMatch[0].match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/)?.[0];
  }

  return dates;
};

/**
 * Procesa datos extraídos de Notion y genera métricas estructuradas
 * @param {Object} extractedData - Datos extraídos de Notion
 * @param {Array<string>} knownInitiatives - Lista de iniciativas conocidas para detectar dependencias
 * @returns {Object} Métricas procesadas
 */
export const processExtractedData = (extractedData, knownInitiatives = []) => {
  if (!extractedData || !extractedData.found || extractedData.pages.length === 0) {
    return {
      initiative: extractedData?.initiative || 'Unknown',
      found: false,
      metrics: null
    };
  }

  // Combinar contenido de todas las páginas
  const allContent = extractedData.pages
    .map(page => page.content)
    .join('\n\n');

  const allStructured = extractedData.pages
    .map(page => page.structured)
    .reduce((acc, curr) => {
      return {
        headings: [...(acc.headings || []), ...(curr.headings || [])],
        paragraphs: [...(acc.paragraphs || []), ...(curr.paragraphs || [])],
        lists: [...(acc.lists || []), ...(curr.lists || [])],
        todos: [...(acc.todos || []), ...(curr.todos || [])],
        quotes: [...(acc.quotes || []), ...(curr.quotes || [])],
        codeBlocks: [...(acc.codeBlocks || []), ...(curr.codeBlocks || [])]
      };
    }, {});

  // Combinar propiedades
  const allProperties = extractedData.pages
    .map(page => page.properties)
    .reduce((acc, curr) => ({ ...acc, ...curr }), {});

  // Extraer métricas
  // Intentar obtener completion desde propiedades primero
  let completion = null;
  if (allProperties.completion || allProperties.Completion) {
    completion = allProperties.completion || allProperties.Completion;
  } else if (allProperties['Completion %'] || allProperties['Progress']) {
    completion = allProperties['Completion %'] || allProperties['Progress'];
  } else {
    completion = extractCompletionPercentage(allContent);
  }

  const tasks = extractTasks(allStructured);
  
  // Extraer story points (con propiedades)
  const storyPoints = extractStoryPoints(allContent, allProperties);

  const status = detectStatus(allContent, allProperties);

  const blockers = extractBlockers(allContent);

  const dependencies = extractDependencies(allContent, knownInitiatives);

  const dates = extractDates(allContent);

  return {
    initiative: extractedData.initiative,
    found: true,
    notionPageIds: extractedData.pages.map(p => p.pageId),
    notionUrls: extractedData.pages.map(p => p.url),
    metrics: {
      status,
      completion: completion !== null ? completion : (tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0),
      tasksCompleted: tasks.completed,
      tasksTotal: tasks.total,
      storyPointsDone: storyPoints.done,
      storyPointsTotal: storyPoints.total,
      blockers,
      dependencies,
      extractedDates: dates
    },
    extractedData: {
      ...allProperties,
      ...dates,
      team: allProperties.team || allProperties.squad || null
    },
    rawContent: allContent.substring(0, 50000), // Limitar tamaño
    structuredContent: allStructured,
    extractedAt: extractedData.extractedAt
  };
};

export default {
  extractCompletionPercentage,
  extractTasks,
  extractStoryPoints,
  detectStatus,
  extractBlockers,
  extractDependencies,
  extractDates,
  processExtractedData
};

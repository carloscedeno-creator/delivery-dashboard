/**
 * Servicio para extraer contenido completo de páginas de Notion
 * Sin usar IA, solo extracción estructurada de datos
 */

import { NOTION_CONFIG } from '../config/notionConfig.js';

/**
 * Obtiene todos los bloques de una página de Notion
 * @param {string} pageId - ID de la página de Notion
 * @returns {Promise<Array>} Array de bloques
 */
export const getPageBlocks = async (pageId) => {
  try {
    const proxyUrl = `${NOTION_CONFIG.proxyUrl}?action=getPageBlocks&pageId=${pageId}`;
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[NOTION] Error fetching page blocks:', error);
    throw error;
  }
};

/**
 * Extrae texto de un bloque de Notion
 * @param {Object} block - Bloque de Notion
 * @returns {string} Texto extraído
 */
const extractBlockText = (block) => {
  if (!block || !block.type) return '';

  const type = block.type;

  switch (type) {
    case 'paragraph':
      return block.paragraph?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'heading_1':
      return block.heading_1?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'heading_2':
      return block.heading_2?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'heading_3':
      return block.heading_3?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'bulleted_list_item':
      return block.bulleted_list_item?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'numbered_list_item':
      return block.numbered_list_item?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'to_do':
      const todoText = block.to_do?.rich_text?.map(rt => rt.plain_text).join('') || '';
      const checked = block.to_do?.checked ? '[x]' : '[ ]';
      return `${checked} ${todoText}`;
    
    case 'toggle':
      return block.toggle?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'quote':
      return `> ${block.quote?.rich_text?.map(rt => rt.plain_text).join('') || ''}`;
    
    case 'callout':
      return block.callout?.rich_text?.map(rt => rt.plain_text).join('') || '';
    
    case 'code':
      return `\`\`\`${block.code?.language || ''}\n${block.code?.rich_text?.map(rt => rt.plain_text).join('') || ''}\n\`\`\``;
    
    case 'table':
      // Extraer contenido de tabla
      return '[Table content]'; // Se puede mejorar extrayendo filas
    
    case 'table_row':
      return block.table_row?.cells?.map(cell => 
        cell.map(rt => rt.plain_text).join('')
      ).join(' | ') || '';
    
    default:
      return '';
  }
};

/**
 * Extrae todo el contenido de texto de una página de Notion
 * @param {string} pageId - ID de la página
 * @returns {Promise<string>} Contenido completo en texto plano
 */
export const extractPageContent = async (pageId) => {
  try {
    const blocks = await getPageBlocks(pageId);
    const contentParts = [];

    for (const block of blocks) {
      const text = extractBlockText(block);
      if (text.trim()) {
        contentParts.push(text);
      }

      // Si el bloque tiene hijos, procesarlos recursivamente
      if (block.has_children) {
        const childBlocks = await getPageBlocks(block.id);
        for (const childBlock of childBlocks) {
          const childText = extractBlockText(childBlock);
          if (childText.trim()) {
            contentParts.push(`  ${childText}`); // Indentar hijos
          }
        }
      }
    }

    return contentParts.join('\n');
  } catch (error) {
    console.error('[NOTION] Error extracting page content:', error);
    throw error;
  }
};

/**
 * Extrae contenido estructurado de una página
 * @param {string} pageId - ID de la página
 * @returns {Promise<Object>} Contenido estructurado
 */
export const extractStructuredContent = async (pageId) => {
  try {
    const blocks = await getPageBlocks(pageId);
    const structured = {
      headings: [],
      paragraphs: [],
      lists: [],
      todos: [],
      quotes: [],
      codeBlocks: [],
      tables: []
    };

    for (const block of blocks) {
      const type = block.type;
      const text = extractBlockText(block);

      switch (type) {
        case 'heading_1':
        case 'heading_2':
        case 'heading_3':
          structured.headings.push({
            level: type === 'heading_1' ? 1 : type === 'heading_2' ? 2 : 3,
            text: text
          });
          break;
        
        case 'paragraph':
          if (text.trim()) {
            structured.paragraphs.push(text);
          }
          break;
        
        case 'bulleted_list_item':
        case 'numbered_list_item':
          structured.lists.push(text);
          break;
        
        case 'to_do':
          structured.todos.push({
            checked: block.to_do?.checked || false,
            text: text.replace(/^\[[x\s]\]\s*/, '')
          });
          break;
        
        case 'quote':
          structured.quotes.push(text);
          break;
        
        case 'code':
          structured.codeBlocks.push({
            language: block.code?.language || '',
            code: block.code?.rich_text?.map(rt => rt.plain_text).join('') || ''
          });
          break;
      }
    }

    return structured;
  } catch (error) {
    console.error('[NOTION] Error extracting structured content:', error);
    throw error;
  }
};

/**
 * Busca páginas de Notion por nombre de iniciativa
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Array>} Array de páginas encontradas
 */
export const searchPagesByInitiative = async (initiativeName) => {
  try {
    // No especificar databaseId para buscar en todas las bases de datos
    const proxyUrl = `${NOTION_CONFIG.proxyUrl}?action=searchPages&initiativeName=${encodeURIComponent(initiativeName)}`;
    
    // Incluir header de autorización si está disponible
    const headers = {
      'Content-Type': 'application/json'
    };
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseAnonKey) {
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }
    
    const response = await fetch(proxyUrl, { headers });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('[NOTION] Error searching pages:', error);
    throw error;
  }
};

/**
 * Extrae todas las propiedades de una página de Notion
 * @param {Object} page - Objeto de página de Notion
 * @returns {Object} Propiedades extraídas
 */
export const extractPageProperties = (page) => {
  if (!page || !page.properties) return {};

  const properties = {};
  
  // Extraer TODAS las propiedades disponibles (no solo las configuradas)
  Object.entries(page.properties).forEach(([propName, prop]) => {
    properties[propName] = extractPropertyValue(prop);
    
    // También agregar con nombre normalizado (sin espacios, lowercase)
    const normalizedName = propName.toLowerCase().replace(/\s+/g, '_');
    if (normalizedName !== propName.toLowerCase()) {
      properties[normalizedName] = extractPropertyValue(prop);
    }
  });

  return properties;
};

/**
 * Extrae el valor de una propiedad de Notion
 * @param {Object} property - Propiedad de Notion
 * @returns {any} Valor extraído
 */
const extractPropertyValue = (property) => {
  if (!property) return null;

  const type = property.type;

  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.map(rt => rt.plain_text).join('') || '';
    case 'number':
      return property.number || 0;
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map(s => s.name) || [];
    case 'date':
      return property.date?.start || null;
    case 'checkbox':
      return property.checkbox || false;
    case 'people':
      return property.people?.map(p => p.name || p.id) || [];
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    default:
      return null;
  }
};

/**
 * Extrae datos completos de una iniciativa desde Notion
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Object>} Datos completos extraídos
 */
export const extractInitiativeData = async (initiativeName) => {
  try {
    console.log(`[NOTION] Extracting data for initiative: ${initiativeName}`);

    // 1. Buscar páginas
    const pages = await searchPagesByInitiative(initiativeName);
    
    if (pages.length === 0) {
      console.warn(`[NOTION] No pages found for initiative: ${initiativeName}`);
      return {
        initiative: initiativeName,
        found: false,
        pages: []
      };
    }

    // 2. Procesar cada página encontrada
    const extractedPages = await Promise.all(
      pages.map(async (page) => {
        const pageId = page.id;
        
        // Extraer contenido completo
        const content = await extractPageContent(pageId);
        
        // Extraer contenido estructurado
        const structured = await extractStructuredContent(pageId);
        
        // Extraer propiedades
        const properties = extractPageProperties(page);

        return {
          pageId,
          url: page.url,
          content,
          structured,
          properties,
          lastEdited: page.last_edited_time
        };
      })
    );

    return {
      initiative: initiativeName,
      found: true,
      pages: extractedPages,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[NOTION] Error extracting initiative data:', error);
    throw error;
  }
};

export default {
  getPageBlocks,
  extractPageContent,
  extractStructuredContent,
  searchPagesByInitiative,
  extractPageProperties,
  extractInitiativeData
};

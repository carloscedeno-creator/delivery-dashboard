/**
 * Configuración de proyectos/squads a sincronizar
 * Soporta múltiples proyectos de diferentes dominios de Jira
 */

/**
 * Formato de configuración de proyecto:
 * {
 *   projectKey: 'OBD',           // Clave del proyecto en Jira
 *   projectName: 'OBD Project',  // Nombre del proyecto
 *   jiraDomain: 'goavanto.atlassian.net',  // Dominio de Jira
 *   jiraEmail: 'email@ejemplo.com',  // Email para autenticación
 *   jiraApiToken: 'token',  // Token de API (o usar variable de entorno)
 * }
 */

// Obtener proyectos desde variables de entorno o usar configuración por defecto
function getProjectsFromEnv() {
  const projectsEnv = process.env.PROJECTS_CONFIG;
  
  if (projectsEnv) {
    try {
      // Limpiar el JSON: remover comentarios y espacios extra
      let cleanedJson = projectsEnv.trim();
      
      // Remover comentarios de línea (// ...) si existen
      cleanedJson = cleanedJson.replace(/\/\/.*$/gm, '');
      
      // Remover comentarios de bloque (/* ... */) si existen
      cleanedJson = cleanedJson.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Intentar parsear
      const parsed = JSON.parse(cleanedJson);
      
      if (!Array.isArray(parsed)) {
        throw new Error('PROJECTS_CONFIG debe ser un array de proyectos');
      }
      
      return parsed;
    } catch (error) {
      console.error('❌ Error parseando PROJECTS_CONFIG:');
      console.error('   Error:', error.message);
      console.error('   Longitud del JSON:', projectsEnv.length);
      console.error('   Primeros 200 caracteres:', projectsEnv.substring(0, 200));
      console.error('   Últimos 200 caracteres:', projectsEnv.substring(Math.max(0, projectsEnv.length - 200)));
      console.error('   Posición del error:', error.message.match(/position (\d+)/)?.[1] || 'N/A');
      if (error.message.includes('position')) {
        const pos = parseInt(error.message.match(/position (\d+)/)?.[1] || '0');
        const start = Math.max(0, pos - 50);
        const end = Math.min(projectsEnv.length, pos + 50);
        console.error('   Contexto del error:', projectsEnv.substring(start, end));
      }
      throw new Error(`Error parseando PROJECTS_CONFIG: ${error.message}`);
    }
  }
  
  return null;
}

// Configuración por defecto (si no se usa PROJECTS_CONFIG)
const defaultProjects = [
  {
    projectKey: 'OBD',
    projectName: 'OBD Project',
    jiraDomain: 'goavanto.atlassian.net',
    jiraEmail: process.env.JIRA_EMAIL || 'carlos.cedeno@agenticdream.com',
    jiraApiToken: process.env.JIRA_API_TOKEN,
  },
  // Agregar más proyectos aquí si es necesario
];

// Exportar proyectos configurados
export const projects = getProjectsFromEnv() || defaultProjects;

// Validar que todos los proyectos tengan la configuración necesaria
export function validateProjects() {
  const errors = [];
  
  projects.forEach((project, index) => {
    if (!project.projectKey) {
      errors.push(`Proyecto ${index}: falta projectKey`);
    }
    if (!project.jiraDomain) {
      errors.push(`Proyecto ${index}: falta jiraDomain`);
    }
    if (!project.jiraEmail) {
      errors.push(`Proyecto ${index}: falta jiraEmail`);
    }
    if (!project.jiraApiToken) {
      errors.push(`Proyecto ${index}: falta jiraApiToken`);
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`❌ Errores en configuración de proyectos:\n${errors.join('\n')}`);
  }
  
  return true;
}

export default projects;

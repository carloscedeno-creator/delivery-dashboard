/**
 * Retry Helper con Exponential Backoff
 * Maneja reintentos automáticos para llamadas a APIs externas, especialmente Jira
 * 
 * Características:
 * - Manejo de rate limiting (429) respetando header retry-after
 * - Exponential backoff para errores temporales (5xx)
 * - No retry para errores permanentes (4xx excepto 429)
 * - Logging detallado de reintentos
 */

import { logger } from './logger.js';

/**
 * Configuración por defecto para retry
 */
const DEFAULT_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 segundo
  maxDelay: 60000, // 60 segundos máximo
  backoffMultiplier: 2,
  retryableStatuses: [429, 500, 502, 503, 504], // Rate limit y errores temporales
  nonRetryableStatuses: [400, 401, 403, 404], // Errores permanentes (excepto 429)
};

/**
 * Calcula el delay para exponential backoff
 * @param {number} attemptNumber - Número de intento (empezando en 0)
 * @param {number} initialDelay - Delay inicial en ms
 * @param {number} maxDelay - Delay máximo en ms
 * @param {number} multiplier - Multiplicador para exponential backoff
 * @returns {number} Delay en milisegundos
 */
function calculateBackoffDelay(attemptNumber, initialDelay, maxDelay, multiplier) {
  const delay = initialDelay * Math.pow(multiplier, attemptNumber);
  return Math.min(delay, maxDelay);
}

/**
 * Extrae el tiempo de retry-after del header de respuesta
 * @param {Object} response - Objeto de respuesta de axios
 * @returns {number|null} Tiempo en milisegundos o null si no existe
 */
function extractRetryAfter(response) {
  if (!response || !response.headers) {
    return null;
  }

  const retryAfter = response.headers['retry-after'] || response.headers['Retry-After'];
  if (!retryAfter) {
    return null;
  }

  // Retry-After puede ser un número (segundos) o una fecha HTTP
  const retryAfterNum = parseInt(retryAfter, 10);
  if (!isNaN(retryAfterNum)) {
    return retryAfterNum * 1000; // Convertir a milisegundos
  }

  // Si es una fecha, calcular diferencia
  try {
    const retryDate = new Date(retryAfter);
    const now = new Date();
    const diff = retryDate.getTime() - now.getTime();
    return diff > 0 ? diff : null;
  } catch (error) {
    logger.warn(`⚠️ No se pudo parsear retry-after header: ${retryAfter}`);
    return null;
  }
}

/**
 * Determina si un error es retryable
 * @param {Error} error - Error de axios
 * @param {Array<number>} retryableStatuses - Códigos de estado que permiten retry
 * @param {Array<number>} nonRetryableStatuses - Códigos de estado que NO permiten retry
 * @returns {boolean} true si el error es retryable
 */
function isRetryableError(error, retryableStatuses, nonRetryableStatuses) {
  // Si no hay respuesta, podría ser un error de red (retryable)
  if (!error.response) {
    return true;
  }

  const status = error.response.status;

  // Errores permanentes específicos no son retryable
  if (nonRetryableStatuses.includes(status)) {
    return false;
  }

  // Rate limiting (429) siempre es retryable
  if (status === 429) {
    return true;
  }

  // Errores temporales del servidor son retryable
  if (retryableStatuses.includes(status)) {
    return true;
  }

  // Otros errores no son retryable por defecto
  return false;
}

/**
 * Ejecuta una función con retry automático y exponential backoff
 * 
 * @param {Function} fn - Función async a ejecutar
 * @param {Object} options - Opciones de configuración
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 5)
 * @param {number} options.initialDelay - Delay inicial en ms (default: 1000)
 * @param {number} options.maxDelay - Delay máximo en ms (default: 60000)
 * @param {number} options.backoffMultiplier - Multiplicador para backoff (default: 2)
 * @param {Array<number>} options.retryableStatuses - Códigos de estado retryable
 * @param {Array<number>} options.nonRetryableStatuses - Códigos de estado no retryable
 * @param {string} options.context - Contexto para logging (opcional)
 * @returns {Promise<any>} Resultado de la función
 * @throws {Error} Error después de agotar todos los reintentos
 */
export async function retryWithBackoff(fn, options = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...options,
  };

  const {
    maxRetries,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    retryableStatuses,
    nonRetryableStatuses,
    context = 'retry',
  } = config;

  let lastError = null;
  let attemptNumber = 0;

  while (attemptNumber <= maxRetries) {
    try {
      if (attemptNumber > 0) {
        logger.info(`🔄 [${context}] Reintento ${attemptNumber}/${maxRetries}...`);
      }

      const result = await fn();
      
      if (attemptNumber > 0) {
        logger.success(`✅ [${context}] Reintento ${attemptNumber} exitoso`);
      }

      return result;
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const statusText = error.response?.statusText || 'Unknown';

      // Si no es retryable, lanzar error inmediatamente
      if (!isRetryableError(error, retryableStatuses, nonRetryableStatuses)) {
        logger.error(`❌ [${context}] Error no retryable (${status}):`, {
          message: error.message,
          status,
          statusText,
        });
        throw error;
      }

      // Si agotamos los reintentos, lanzar error
      if (attemptNumber >= maxRetries) {
        logger.error(`❌ [${context}] Agotados todos los reintentos (${maxRetries + 1} intentos totales):`, {
          message: error.message,
          status,
          statusText,
          lastAttempt: attemptNumber,
        });
        throw error;
      }

      // Calcular delay para el siguiente intento
      let delay;

      // Si es rate limiting (429), usar retry-after header si está disponible
      if (status === 429) {
        const retryAfter = extractRetryAfter(error.response);
        if (retryAfter && retryAfter > 0) {
          delay = retryAfter;
          logger.warn(`⏳ [${context}] Rate limit (429) detectado. Esperando ${delay}ms según retry-after header...`);
        } else {
          // Si no hay retry-after, usar exponential backoff
          delay = calculateBackoffDelay(attemptNumber, initialDelay, maxDelay, backoffMultiplier);
          logger.warn(`⏳ [${context}] Rate limit (429) detectado. Esperando ${delay}ms (exponential backoff)...`);
        }
      } else {
        // Para otros errores temporales, usar exponential backoff
        delay = calculateBackoffDelay(attemptNumber, initialDelay, maxDelay, backoffMultiplier);
        logger.warn(`⏳ [${context}] Error temporal (${status}). Esperando ${delay}ms antes de reintentar...`);
      }

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay));
      attemptNumber++;
    }
  }

  // Esto no debería ejecutarse nunca, pero por seguridad
  throw lastError;
}

/**
 * Helper para agregar delay entre páginas en paginación
 * Útil para evitar rate limiting durante paginación masiva
 * 
 * @param {number} delayMs - Delay en milisegundos (default: 200)
 * @returns {Promise<void>}
 */
export async function delayBetweenPages(delayMs = 200) {
  await new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Wrapper para aplicar retry a métodos de axios
 * 
 * @param {Function} axiosMethod - Método de axios (ej: client.get)
 * @param {string} url - URL a llamar
 * @param {Object} config - Configuración de axios
 * @param {Object} retryOptions - Opciones de retry
 * @returns {Promise<any>} Respuesta de axios
 */
export async function retryAxiosRequest(axiosMethod, url, config = {}, retryOptions = {}) {
  return retryWithBackoff(
    async () => {
      return await axiosMethod(url, config);
    },
    {
      context: `axios-request:${url}`,
      ...retryOptions,
    }
  );
}

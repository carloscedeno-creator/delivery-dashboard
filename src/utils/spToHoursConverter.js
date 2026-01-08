/**
 * Convierte Story Points a horas según la tabla de conversión no lineal
 * Tabla de conversión:
 * - 1 SP = 4 horas
 * - 2 SP = 8 horas o menos
 * - 3 SP = 2 días o menos (16 horas)
 * - 5 SP = 4 días o menos (32 horas)
 */

/**
 * Convierte Story Points a horas
 * @param {number} storyPoints - Número de Story Points
 * @returns {number} Horas equivalentes
 */
export const convertSPToHours = (storyPoints) => {
  if (!storyPoints || storyPoints <= 0) {
    return 0;
  }

  // Tabla de conversión no lineal
  if (storyPoints === 1) {
    return 4; // 1 SP = 4 horas
  }
  
  if (storyPoints === 2) {
    return 8; // 2 SP = 8 horas o menos
  }
  
  if (storyPoints === 3) {
    return 16; // 3 SP = 2 días o menos (16 horas)
  }
  
  if (storyPoints === 5) {
    return 32; // 5 SP = 4 días o menos (32 horas)
  }

  // Para valores intermedios o mayores, usar interpolación lineal
  // Entre 1-2: 4-8 horas (4 horas por SP)
  if (storyPoints > 1 && storyPoints < 2) {
    return 4 + (storyPoints - 1) * 4; // 4 + (SP-1)*4
  }
  
  // Entre 2-3: 8-16 horas (8 horas por SP adicional)
  if (storyPoints > 2 && storyPoints < 3) {
    return 8 + (storyPoints - 2) * 8; // 8 + (SP-2)*8
  }
  
  // Entre 3-5: 16-32 horas (8 horas por SP adicional)
  if (storyPoints > 3 && storyPoints < 5) {
    return 16 + (storyPoints - 3) * 8; // 16 + (SP-3)*8
  }
  
  // Para valores mayores a 5, usar promedio: ~6.4 horas por SP
  // (basado en: 32 horas / 5 SP = 6.4 horas/SP)
  if (storyPoints > 5) {
    return storyPoints * 6.4;
  }

  // Fallback: usar promedio conservador
  return storyPoints * 5;
};

/**
 * Convierte un array de Story Points a horas totales
 * @param {Array<number>} storyPointsArray - Array de Story Points
 * @returns {number} Total de horas
 */
export const convertSPArrayToHours = (storyPointsArray) => {
  if (!Array.isArray(storyPointsArray)) {
    return 0;
  }

  return storyPointsArray.reduce((total, sp) => {
    return total + convertSPToHours(sp);
  }, 0);
};


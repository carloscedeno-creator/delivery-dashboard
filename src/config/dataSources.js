/**
 * Configuración centralizada de fuentes de datos externas
 * Este archivo contiene todas las URLs de Google Sheets y otros datasources
 */

// ============================================
// GOOGLE SHEETS - DELIVERY ROADMAP
// ============================================
export const DELIVERY_ROADMAP = {
    name: 'Big Roadmap Main Innitiatives',
    spreadsheetId: '1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8',
    sheets: {
        projects: {
            gid: '1503252593',
            url: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1503252593',
            description: 'Proyectos de delivery con estados, SPI, fechas y asignaciones'
        },
        allocation: {
            gid: '1194298779',
            url: 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1194298779',
            description: 'Asignación de desarrolladores por proyecto'
        }
    }
};

// ============================================
// GOOGLE SHEETS - PRODUCT ROADMAP
// ============================================
export const PRODUCT_ROADMAP = {
    name: 'Product Roadmap',
    spreadsheetId: 'e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN',
    sheets: {
        initiatives: {
            gid: '933125518',
            url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv',
            description: 'Iniciativas de producto con BA, Designer, Team, Quarter, Status'
        },
        bugRelease: {
            gid: '1707343419',
            url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=1707343419&single=true&output=csv',
            description: 'Bugs y releases del producto'
        }
    }
};

// ============================================
// CORS PROXY
// ============================================
export const CORS_PROXY = {
    url: 'https://sheets-proxy.carlos-cedeno.workers.dev/?url=',
    description: 'Cloudflare Worker para evitar errores CORS',
    cacheTime: 300 // 5 minutos
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Construye la URL completa con el proxy CORS
 * @param {string} sheetUrl - URL del Google Sheet
 * @returns {string} URL con proxy
 */
export const buildProxiedUrl = (sheetUrl) => {
    return `${CORS_PROXY.url}${encodeURIComponent(sheetUrl)}`;
};

/**
 * Obtiene todas las URLs de un roadmap específico
 * @param {Object} roadmap - Objeto de roadmap (DELIVERY_ROADMAP o PRODUCT_ROADMAP)
 * @returns {Object} Objeto con las URLs de todas las hojas
 */
export const getRoadmapUrls = (roadmap) => {
    const urls = {};
    Object.keys(roadmap.sheets).forEach(key => {
        urls[key] = roadmap.sheets[key].url;
    });
    return urls;
};

/**
 * Lista todas las fuentes de datos configuradas
 * @returns {Array} Array con información de todas las fuentes
 */
export const listAllDataSources = () => {
    return [
        {
            type: 'Delivery Roadmap',
            name: DELIVERY_ROADMAP.name,
            sheets: Object.keys(DELIVERY_ROADMAP.sheets).length,
            details: DELIVERY_ROADMAP.sheets
        },
        {
            type: 'Product Roadmap',
            name: PRODUCT_ROADMAP.name,
            sheets: Object.keys(PRODUCT_ROADMAP.sheets).length,
            details: PRODUCT_ROADMAP.sheets
        }
    ];
};

// ============================================
// EXPORTS AGRUPADOS
// ============================================
export default {
    DELIVERY_ROADMAP,
    PRODUCT_ROADMAP,
    CORS_PROXY,
    buildProxiedUrl,
    getRoadmapUrls,
    listAllDataSources
};

/**
 * Script para probar el matching de iniciativas de Product con strata mapping
 */

import dotenv from 'dotenv';

dotenv.config();

const STRATA_MAPPING_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9DFccJbSxnK2hN65w-hQDKB0KrN-5MO7g8_G3l96wo8V3LtbEkQcZIoWn68zshwO_CSdGJi8ObQX-/pub?gid=753917662&single=true&output=csv';
const PRODUCT_URL = 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=0';

// Helper function to parse CSV (simplified version)
function parseCSV(csvText, type) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const entry = {};
        headers.forEach((header, index) => {
            entry[header] = values[index] || '';
        });
        
        // Apply strata mapping parsing logic
        if (type === 'strataMapping') {
            headers.forEach((header, idx) => {
                const hLower = header.toLowerCase();
                const val = entry[header] || '';
                if (hLower.includes('strata') || hLower === 'layer') entry.strata = val;
                if (hLower.includes('initiative') || hLower === 'initiative name' || hLower === 'initiatives') entry.initiative = val;
                if (hLower.includes('squad') || hLower === 'team') entry.squad = val;
                if (hLower.includes('type') || hLower === 'source') entry.type = val;
                if (hLower.includes('doc link') || hLower.includes('documentation link') || hLower === 'doc' || hLower.includes('doc link')) entry.docLink = val;
            });
        }
        
        data.push(entry);
    }
    
    return data.filter(entry => {
        if (type === 'strataMapping') {
            return entry.strata && entry.initiative;
        }
        return entry.initiative; // Product initiatives only need initiative name
    });
}

// Normalize function
function normalizeInitiativeName(name) {
    if (!name) return '';
    return name.trim().toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Fuzzy match function
function fuzzyMatch(name1, name2) {
    const n1 = normalizeInitiativeName(name1);
    const n2 = normalizeInitiativeName(name2);
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;
    const words1 = n1.split(/\s+/).filter(w => w.length > 2);
    const words2 = n2.split(/\s+/).filter(w => w.length > 2);
    if (words1.length === 0 || words2.length === 0) return false;
    const commonWords = words1.filter(w => words2.includes(w));
    return commonWords.length > 0 && (commonWords.length / Math.max(words1.length, words2.length)) > 0.5;
}

async function testProductStrataMatching() {
  console.log('🔍 Probando matching de Product Initiatives con Strata Mapping\n');
  console.log('='.repeat(60));

  try {
    // Load data
    console.log('📥 Cargando datos...');
    const [strataText, productText] = await Promise.all([
      fetch(STRATA_MAPPING_URL).then(r => r.text()),
      fetch(PRODUCT_URL).then(r => r.text())
    ]);

    const strataMappingData = parseCSV(strataText, 'strataMapping');
    
    // Parse product CSV - find header row and parse initiatives
    const productLines = productText.split('\n').filter(line => line.trim());
    
    // Find header row (look for "Initiative" column)
    let headerRowIndex = -1;
    let productHeaders = [];
    for (let i = 0; i < Math.min(10, productLines.length); i++) {
        const headers = productLines[i].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
        if (headers.includes('initiative')) {
            headerRowIndex = i;
            productHeaders = productLines[i].split(',').map(h => h.trim().replace(/"/g, ''));
            break;
        }
    }
    
    if (headerRowIndex === -1) {
        console.log('⚠️  No se encontró header row con "Initiative"');
        return;
    }
    
    // Normalize headers
    const normalizeHeader = (h) => {
        return h.toLowerCase().trim()
            .replace(/\s+/g, '')
            .replace(/[^\w]/g, '');
    };
    
    const normalizedHeaders = productHeaders.map(normalizeHeader);
    
    // Parse product initiatives
    const productData = [];
    for (let i = headerRowIndex + 1; i < productLines.length; i++) {
        const values = productLines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const entry = {};
        productHeaders.forEach((header, index) => {
            entry[header] = values[index] || '';
        });
        
        // Normalize and extract initiative
        normalizedHeaders.forEach((normH, idx) => {
            const val = entry[productHeaders[idx]] || '';
            if (normH === 'initiative') {
                entry.initiative = val;
            } else if (normH === 'effort') {
                entry.effort = parseFloat(val) || 0;
            } else if (normH === 'completion') {
                entry.completion = parseFloat(val) || 0;
            } else if (normH === 'ba') {
                entry.ba = val;
            } else if (normH === 'designer') {
                entry.designer = val;
            } else if (normH === 'team') {
                entry.team = val;
            } else if (normH === 'quarter') {
                entry.quarter = val;
            } else if (normH === 'status') {
                entry.status = val;
            }
        });
        
        if (entry.initiative) {
            productData.push(entry);
        }
    }

    console.log(`✅ Strata Mapping: ${strataMappingData.length} filas`);
    console.log(`✅ Product Initiatives: ${productData.length} filas\n`);

    // Show strata mapping data with type "product" or no type
    console.log('📋 Datos de Strata Mapping (Product o sin tipo):');
    const productStrataMappings = strataMappingData.filter(m => {
        const type = (m.type || '').toLowerCase();
        return !type || type.includes('product') || type === 'both';
    });
    
    productStrataMappings.slice(0, 5).forEach((mapping, index) => {
      console.log(`\n   ${index + 1}. Strata: "${mapping.strata}"`);
      console.log(`      Initiative: "${mapping.initiative}"`);
      console.log(`      Type: "${mapping.type || 'N/A (buscará en ambos)'}"`);
    });

    // Test matching
    console.log('\n🔍 Probando matching:\n');
    
    const strataGroups = {};
    productStrataMappings.forEach(mapping => {
      const strata = mapping.strata || 'Unknown';
      if (!strataGroups[strata]) {
        strataGroups[strata] = [];
      }
      strataGroups[strata].push(mapping);
    });

    Object.keys(strataGroups).forEach(strata => {
      console.log(`\n📊 ${strata}:`);
      const mappings = strataGroups[strata];
      
      mappings.forEach(mapping => {
        const initiativeName = mapping.initiative;
        console.log(`\n   Buscando: "${initiativeName}"`);
        
        // Try to find in product initiatives
        const matches = productData.filter(product => {
          return fuzzyMatch(product.initiative, initiativeName);
        });
        
        if (matches.length > 0) {
          console.log(`   ✅ Encontrado en Product (${matches.length} match${matches.length > 1 ? 'es' : ''}):`);
          matches.forEach(match => {
            console.log(`      - "${match.initiative}" (Team: ${match.team || 'N/A'}, Completion: ${match.completion || 0}%)`);
          });
        } else {
          console.log(`   ❌ NO encontrado en Product`);
          console.log(`   💡 Nombres similares en Product:`);
          const similar = productData.filter(product => {
            const pName = normalizeInitiativeName(product.initiative);
            const mName = normalizeInitiativeName(initiativeName);
            // Check if any word matches
            const pWords = pName.split(/\s+/);
            const mWords = mName.split(/\s+/);
            return pWords.some(w => mWords.includes(w) && w.length > 3);
          }).slice(0, 3);
          
          if (similar.length > 0) {
            similar.forEach(s => {
              console.log(`      - "${s.initiative}" (Team: ${s.team || 'N/A'})`);
            });
          } else {
            console.log(`      (ninguna similaridad encontrada)`);
          }
        }
      });
    });

    // Summary
    console.log('\n📊 Resumen:');
    let totalMappings = 0;
    let totalMatches = 0;
    Object.keys(strataGroups).forEach(strata => {
      const mappings = strataGroups[strata];
      const matches = mappings.filter(mapping => {
        return productData.some(product => fuzzyMatch(product.initiative, mapping.initiative));
      });
      totalMappings += mappings.length;
      totalMatches += matches.length;
      console.log(`   ${strata}: ${matches.length}/${mappings.length} matches`);
    });
    console.log(`\n   Total: ${totalMatches}/${totalMappings} matches encontrados`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testProductStrataMatching()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

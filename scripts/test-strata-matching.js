/**
 * Script para probar el matching de iniciativas con strata mapping
 */

import dotenv from 'dotenv';

dotenv.config();

const STRATA_MAPPING_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9DFccJbSxnK2hN65w-hQDKB0KrN-5MO7g8_G3l96wo8V3LtbEkQcZIoWn68zshwO_CSdGJi8ObQX-/pub?gid=753917662&single=true&output=csv';
const PROJECT_URL = 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1503252593';

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
        return entry.squad && entry.initiative;
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

async function testStrataMatching() {
  console.log('🔍 Probando matching de Strata Mapping\n');
  console.log('='.repeat(60));

  try {
    // Load data
    console.log('📥 Cargando datos...');
    const [strataText, projectText] = await Promise.all([
      fetch(STRATA_MAPPING_URL).then(r => r.text()),
      fetch(PROJECT_URL).then(r => r.text())
    ]);

    const strataMappingData = parseCSV(strataText, 'strataMapping');
    
    // Parse projects CSV manually (matching the actual parser logic)
    const projectLines = projectText.split('\n').filter(line => line.trim());
    const projectHeaders = projectLines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const projectData = [];
    for (let i = 1; i < projectLines.length; i++) {
        const values = projectLines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        const entry = {};
        projectHeaders.forEach((header, index) => {
            entry[header] = values[index] || '';
        });
        // Apply project parsing logic
        if (entry['Squad']) entry.squad = entry['Squad'];
        if (entry['Initiatives']) entry.initiative = entry['Initiatives'];
        if (entry['Start']) entry.start = entry['Start'];
        if (entry['Current Status']) entry.status = parseFloat(entry['Current Status']) || 0;
        if (entry['Estimated Delivery']) entry.delivery = entry['Estimated Delivery'];
        if (entry['SPI']) entry.spi = parseFloat(entry['SPI']) || 0;
        if (entry['Team Allocation']) entry.allocation = parseFloat(entry['Team Allocation']) || 0;
        if (entry['Comments']) entry.comments = entry['Comments'];
        if (entry['Scope']) entry.scope = entry['Scope'];
        
        // Filter: must have squad and initiative
        if (entry.squad && entry.initiative) {
            projectData.push(entry);
        }
    }

    console.log(`✅ Strata Mapping: ${strataMappingData.length} filas`);
    console.log(`✅ Projects: ${projectData.length} filas\n`);

    // Show strata mapping data
    console.log('📋 Datos de Strata Mapping:');
    strataMappingData.slice(0, 5).forEach((mapping, index) => {
      console.log(`\n   ${index + 1}. Strata: "${mapping.strata}"`);
      console.log(`      Initiative: "${mapping.initiative}"`);
      console.log(`      Squad: "${mapping.squad || 'N/A'}"`);
      console.log(`      Type: "${mapping.type || 'N/A (buscará en ambos)'}"`);
    });

    // Test matching
    console.log('\n🔍 Probando matching:\n');
    
    const strataGroups = {};
    strataMappingData.forEach(mapping => {
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
        
        // Try to find in projects
        const matches = projectData.filter(project => {
          return fuzzyMatch(project.initiative, initiativeName);
        });
        
        if (matches.length > 0) {
          console.log(`   ✅ Encontrado en Projects (${matches.length} match${matches.length > 1 ? 'es' : ''}):`);
          matches.forEach(match => {
            console.log(`      - "${match.initiative}" (Squad: ${match.squad})`);
          });
        } else {
          console.log(`   ❌ NO encontrado en Projects`);
          console.log(`   💡 Nombres similares en Projects:`);
          const similar = projectData.filter(project => {
            const pName = normalizeInitiativeName(project.initiative);
            const mName = normalizeInitiativeName(initiativeName);
            // Check if any word matches
            const pWords = pName.split(/\s+/);
            const mWords = mName.split(/\s+/);
            return pWords.some(w => mWords.includes(w) && w.length > 3);
          }).slice(0, 3);
          
          if (similar.length > 0) {
            similar.forEach(s => {
              console.log(`      - "${s.initiative}" (Squad: ${s.squad})`);
            });
          } else {
            console.log(`      (ninguna similaridad encontrada)`);
          }
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testStrataMatching()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

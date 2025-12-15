/**
 * Script para inspeccionar el CSV de Strata Mapping desde Google Drive
 */

import dotenv from 'dotenv';

dotenv.config();

const STRATA_MAPPING_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ9DFccJbSxnK2hN65w-hQDKB0KrN-5MO7g8_G3l96wo8V3LtbEkQcZIoWn68zshwO_CSdGJi8ObQX-/pub?gid=753917662&single=true&output=csv';

async function inspectStrataMapping() {
  console.log('🔍 Inspeccionando CSV de Strata Mapping\n');
  console.log('='.repeat(60));

  try {
    // Fetch CSV
    console.log('📥 Descargando CSV desde Google Drive...');
    const response = await fetch(STRATA_MAPPING_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log(`✅ CSV descargado: ${csvText.length} caracteres\n`);

    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim());
    console.log(`📊 Total de líneas: ${lines.length}\n`);

    if (lines.length === 0) {
      console.log('⚠️  El CSV está vacío');
      return;
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('📋 Headers encontrados:');
    headers.forEach((header, index) => {
      console.log(`   ${index + 1}. "${header}"`);
    });
    console.log('');

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const entry = {};
      headers.forEach((header, index) => {
        entry[header] = values[index] || '';
      });
      data.push(entry);
    }

    console.log(`📦 Filas de datos: ${data.length}\n`);

    // Analyze data
    console.log('🔍 Análisis de datos:\n');

    // Find strata column
    const strataColumn = headers.find(h => 
      h.toLowerCase().includes('strata') || 
      h.toLowerCase() === 'layer' ||
      h.toLowerCase().includes('layer')
    );
    console.log(`✅ Columna de Strata encontrada: "${strataColumn || 'NO ENCONTRADA'}"`);

    // Find initiative column
    const initiativeColumn = headers.find(h => 
      h.toLowerCase().includes('initiative') ||
      h.toLowerCase() === 'initiative name'
    );
    console.log(`✅ Columna de Initiative encontrada: "${initiativeColumn || 'NO ENCONTRADA'}"`);

    // Find type column
    const typeColumn = headers.find(h => 
      h.toLowerCase().includes('type') ||
      h.toLowerCase() === 'source'
    );
    console.log(`✅ Columna de Type encontrada: "${typeColumn || 'NO ENCONTRADA'}"\n`);

    // Show unique strata values
    if (strataColumn) {
      const uniqueStrata = [...new Set(data.map(row => row[strataColumn]).filter(Boolean))];
      console.log(`📊 Valores únicos de Strata (${uniqueStrata.length}):`);
      uniqueStrata.forEach(strata => {
        const count = data.filter(row => row[strataColumn] === strata).length;
        console.log(`   - "${strata}" (${count} iniciativas)`);
      });
      console.log('');
    }

    // Show sample data
    console.log('📋 Primeras 5 filas de datos:');
    data.slice(0, 5).forEach((row, index) => {
      console.log(`\n   Fila ${index + 1}:`);
      Object.keys(row).forEach(key => {
        if (row[key]) {
          console.log(`      ${key}: "${row[key]}"`);
        }
      });
    });

    // Check for matching issues
    console.log('\n🔍 Verificando problemas de matching:\n');
    
    if (!strataColumn) {
      console.log('❌ No se encontró columna de Strata');
      console.log('   Busca columnas que contengan: "strata", "layer"');
    }
    
    if (!initiativeColumn) {
      console.log('❌ No se encontró columna de Initiative');
      console.log('   Busca columnas que contengan: "initiative", "initiative name"');
    }

    // Show data structure for parsing
    console.log('\n📝 Estructura esperada para el parser:');
    console.log('   - Campo "strata": columnas que incluyan "strata" o "layer"');
    console.log('   - Campo "initiative": columnas que incluyan "initiative"');
    console.log('   - Campo "type": columnas que incluyan "type" o "source"');
    console.log('   - Campo "squad": columnas que incluyan "squad" o "team"');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

inspectStrataMapping()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Inspección completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

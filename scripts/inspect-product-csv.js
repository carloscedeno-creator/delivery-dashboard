/**
 * Script para inspeccionar el CSV de Product desde Google Drive
 */

import dotenv from 'dotenv';

dotenv.config();

const PRODUCT_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv';

async function inspectProductCSV() {
  console.log('🔍 Inspeccionando CSV de Product Initiatives\n');
  console.log('='.repeat(60));

  try {
    // Fetch CSV
    console.log('📥 Descargando CSV desde Google Drive...');
    const response = await fetch(PRODUCT_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const csvText = await response.text();
    console.log(`✅ CSV descargado: ${csvText.length} caracteres\n`);

    // Show first 2000 characters
    console.log('📄 Primeros 2000 caracteres del CSV:');
    console.log(csvText.substring(0, 2000));
    console.log('\n' + '='.repeat(60) + '\n');

    // Try to parse with the same logic as the app
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;
    for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentVal.trim());
            currentVal = '';
        } else if (char === '\n' && !inQuotes) {
            currentRow.push(currentVal.trim());
            rows.push(currentRow);
            currentRow = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    if (currentVal || currentRow.length > 0) {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
    }

    console.log(`📊 Total de filas parseadas: ${rows.length}\n`);

    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(10, rows.length); i++) {
        const rowLower = rows[i].map(v => v.toLowerCase().trim());
        if (rowLower.includes('initiative')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.log('⚠️  No se encontró header row con "Initiative"');
        console.log('📋 Primeras 5 filas:');
        rows.slice(0, 5).forEach((row, idx) => {
            console.log(`   Fila ${idx}:`, row.slice(0, 5).join(', '));
        });
        return;
    }

    const headers = rows[headerRowIndex];
    console.log(`✅ Header row encontrado en índice ${headerRowIndex}`);
    console.log('📋 Headers:');
    headers.forEach((header, index) => {
        console.log(`   ${index + 1}. "${header}"`);
    });
    console.log('');

    // Show data rows
    console.log(`📦 Filas de datos: ${rows.length - headerRowIndex - 1}\n`);
    console.log('📋 Primeras 5 filas de datos:');
    rows.slice(headerRowIndex + 1, headerRowIndex + 6).forEach((row, index) => {
        console.log(`\n   Fila ${index + 1}:`);
        headers.forEach((header, idx) => {
            if (row[idx]) {
                console.log(`      ${header}: "${row[idx]}"`);
            }
        });
    });

    // Find initiative column
    const initiativeIndex = headers.findIndex(h => h.toLowerCase().includes('initiative'));
    if (initiativeIndex >= 0) {
        console.log(`\n✅ Columna de Initiative en índice ${initiativeIndex}: "${headers[initiativeIndex]}"`);
        
        // Show unique initiatives
        const initiatives = [];
        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const initiative = rows[i][initiativeIndex];
            if (initiative && initiative.trim()) {
                initiatives.push(initiative.trim());
            }
        }
        
        const uniqueInitiatives = [...new Set(initiatives)];
        console.log(`📊 Iniciativas únicas (${uniqueInitiatives.length}):`);
        uniqueInitiatives.slice(0, 10).forEach(initiative => {
            const count = initiatives.filter(i => i === initiative).length;
            console.log(`   - "${initiative}" (${count} fila${count > 1 ? 's' : ''})`);
        });
        if (uniqueInitiatives.length > 10) {
            console.log(`   ... y ${uniqueInitiatives.length - 10} más`);
        }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

inspectProductCSV()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Inspección completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

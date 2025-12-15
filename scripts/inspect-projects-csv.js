/**
 * Script para inspeccionar el CSV de Projects desde Google Drive
 */

import dotenv from 'dotenv';

dotenv.config();

const PROJECT_URL = 'https://docs.google.com/spreadsheets/d/1L98AGoj2jd-oWuxBZ_W0nVFZpwd3zr38jVW5iGhc0s8/export?format=csv&gid=1503252593';

async function inspectProjectsCSV() {
  console.log('🔍 Inspeccionando CSV de Projects\n');
  console.log('='.repeat(60));

  try {
    // Fetch CSV
    console.log('📥 Descargando CSV desde Google Drive...');
    const response = await fetch(PROJECT_URL);
    
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

    // Find initiative column
    const initiativeColumn = headers.find(h => 
      h.toLowerCase().includes('initiative')
    );
    console.log(`✅ Columna de Initiative encontrada: "${initiativeColumn || 'NO ENCONTRADA'}"`);

    // Find squad column
    const squadColumn = headers.find(h => 
      h.toLowerCase().includes('squad') ||
      h.toLowerCase() === 'team'
    );
    console.log(`✅ Columna de Squad encontrada: "${squadColumn || 'NO ENCONTRADA'}"\n`);

    // Show unique initiatives
    if (initiativeColumn) {
      const uniqueInitiatives = [...new Set(data.map(row => row[initiativeColumn]).filter(Boolean))];
      console.log(`📊 Iniciativas únicas (${uniqueInitiatives.length}):`);
      uniqueInitiatives.slice(0, 10).forEach(initiative => {
        const count = data.filter(row => row[initiativeColumn] === initiative).length;
        console.log(`   - "${initiative}" (${count} fila${count > 1 ? 's' : ''})`);
      });
      if (uniqueInitiatives.length > 10) {
        console.log(`   ... y ${uniqueInitiatives.length - 10} más`);
      }
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
    console.log('\n🔍 Verificando problemas:\n');
    
    if (!initiativeColumn) {
      console.log('❌ No se encontró columna de Initiative');
      console.log('   Busca columnas que contengan: "initiative"');
    }
    
    if (!squadColumn) {
      console.log('❌ No se encontró columna de Squad');
      console.log('   Busca columnas que contengan: "squad", "team"');
    }

    // Check filter logic
    console.log('\n📝 Filtro aplicado:');
    console.log('   - Debe tener: squad && initiative');
    const validRows = data.filter(row => {
      const hasSquad = squadColumn ? row[squadColumn] : false;
      const hasInitiative = initiativeColumn ? row[initiativeColumn] : false;
      return hasSquad && hasInitiative;
    });
    console.log(`   - Filas válidas después del filtro: ${validRows.length} de ${data.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

inspectProjectsCSV()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Inspección completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

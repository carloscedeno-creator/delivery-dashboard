/**
 * Script para inspeccionar el CSV de Product Roadmap
 * Ejecuta esto en la consola del navegador después de que cargue la página
 */

(async function() {
    console.log('🔍 Inspeccionando CSV de Product Roadmap...\n');
    
    try {
        const corsProxy = 'https://sheets-proxy.carlos-cedeno.workers.dev/?url=';
        const initiativesUrl = ProductRoadmapData.SHEET_URLS.initiatives;
        const fullUrl = corsProxy + encodeURIComponent(initiativesUrl);
        
        console.log('📥 Descargando CSV...');
        const response = await fetch(fullUrl);
        const csvText = await response.text();
        
        console.log('\n✅ CSV descargado:', csvText.length, 'caracteres');
        console.log('\n📄 Primeras 2000 caracteres del CSV:');
        console.log('='.repeat(60));
        console.log(csvText.substring(0, 2000));
        console.log('='.repeat(60));
        
        console.log('\n📊 Análisis del CSV:');
        const lines = csvText.split('\n');
        console.log('- Total de líneas:', lines.length);
        console.log('- Primera línea:', lines[0]);
        console.log('- Segunda línea:', lines[1]);
        console.log('- Tercera línea:', lines[2]);
        
        // Mostrar estructura de columnas
        if (lines.length > 0) {
            const firstLine = lines[0];
            const columns = firstLine.split(',');
            console.log('\n📋 Columnas detectadas (', columns.length, '):');
            columns.forEach((col, i) => {
                console.log(`  ${i + 1}. "${col.trim()}"`);
            });
        }
        
        console.log('\n💡 Copia y pega esta información para que ajusten el parser');
        
    } catch (err) {
        console.error('❌ Error:', err);
    }
})();


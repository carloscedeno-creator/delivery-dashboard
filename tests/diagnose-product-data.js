/**
 * Script de Diagnóstico para Product Roadmap Data
 * Ejecuta esto en la consola del navegador para ver qué está pasando
 */

(async function() {
    console.log('🔍 DIAGNÓSTICO: Product Roadmap Data Loading\n');
    console.log('='.repeat(60));
    
    // 1. Verificar que el módulo existe
    console.log('\n1️⃣ Verificando módulo ProductRoadmapData...');
    if (typeof ProductRoadmapData === 'undefined') {
        console.error('❌ ProductRoadmapData no está definido');
        return;
    }
    console.log('✅ ProductRoadmapData existe');
    
    // 2. Verificar URLs
    console.log('\n2️⃣ Verificando URLs de Google Sheets...');
    const urls = ProductRoadmapData.SHEET_URLS;
    console.log('Initiatives URL:', urls.initiatives);
    console.log('Bug Release URL:', urls.bugRelease);
    
    // 3. Verificar CORS Proxy
    console.log('\n3️⃣ Verificando CORS Proxy...');
    const corsProxy = 'https://sheets-proxy.carlos-cedeno.workers.dev/?url=';
    console.log('CORS Proxy:', corsProxy);
    
    // 4. Probar acceso directo a las URLs (sin proxy)
    console.log('\n4️⃣ Probando acceso directo a Google Sheets (sin proxy)...');
    try {
        const directInitUrl = urls.initiatives;
        console.log('Intentando fetch directo a:', directInitUrl.substring(0, 80) + '...');
        const directResponse = await fetch(directInitUrl);
        console.log('Status:', directResponse.status, directResponse.statusText);
        if (directResponse.ok) {
            const text = await directResponse.text();
            console.log('✅ Acceso directo funciona! Tamaño:', text.length, 'caracteres');
            console.log('Primeros 200 caracteres:', text.substring(0, 200));
        } else {
            console.warn('⚠️ Acceso directo falló:', directResponse.status);
        }
    } catch (err) {
        console.error('❌ Error en acceso directo:', err.message);
        console.log('(Esto es normal si hay CORS)');
    }
    
    // 5. Probar con CORS Proxy
    console.log('\n5️⃣ Probando acceso con CORS Proxy...');
    try {
        const proxiedUrl = corsProxy + encodeURIComponent(urls.initiatives);
        console.log('URL con proxy:', proxiedUrl.substring(0, 100) + '...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const proxiedResponse = await fetch(proxiedUrl, {
            signal: controller.signal,
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        
        console.log('Status:', proxiedResponse.status, proxiedResponse.statusText);
        if (proxiedResponse.ok) {
            const text = await proxiedResponse.text();
            console.log('✅ Proxy funciona! Tamaño:', text.length, 'caracteres');
            console.log('Primeros 300 caracteres:', text.substring(0, 300));
            
            // Intentar parsear
            console.log('\n6️⃣ Probando parseo CSV...');
            const parsed = ProductRoadmapData.parseCSV(text, 'initiatives');
            console.log('✅ Parseo exitoso!', parsed.length, 'iniciativas encontradas');
            console.log('Primeras iniciativas:', parsed.slice(0, 3));
        } else {
            console.error('❌ Proxy falló:', proxiedResponse.status);
            const errorText = await proxiedResponse.text();
            console.log('Error response:', errorText.substring(0, 200));
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.error('❌ Timeout: El proxy no respondió en 10 segundos');
        } else {
            console.error('❌ Error con proxy:', err.message);
        }
        console.log('\n⚠️ Esto significa que el proxy está caído o no responde');
        console.log('El dashboard usará datos mock como fallback');
    }
    
    // 6. Verificar datos mock
    console.log('\n7️⃣ Verificando datos mock...');
    const mockData = ProductRoadmapData.MOCK_DATA;
    console.log('Mock Initiatives:', mockData.initiatives.length);
    console.log('Mock Bug Release:', mockData.bugRelease.length);
    console.log('Iniciativas mock:', mockData.initiatives.map(i => i.initiative));
    
    // 7. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 RESUMEN DEL DIAGNÓSTICO\n');
    console.log('Si ves datos mock en el dashboard, significa que:');
    console.log('1. El CORS proxy no está funcionando, O');
    console.log('2. Las URLs de Google Sheets no son accesibles, O');
    console.log('3. Hay un error de conexión/red');
    console.log('\nEl dashboard funciona con datos mock como fallback.');
    console.log('Para ver datos reales, necesitas:');
    console.log('- Que el CORS proxy esté funcionando');
    console.log('- Que las URLs de Google Sheets sean públicas y accesibles');
    console.log('- Que las hojas tengan los datos correctos');
})();


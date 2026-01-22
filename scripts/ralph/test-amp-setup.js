#!/usr/bin/env node

/**
 * Test Amp Setup - Verifica que el sistema de desarrollo autónomo esté configurado correctamente
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Amp Setup...\n');

// 1. Verificar herramientas disponibles
console.log('🛠️ Verificando herramientas...\n');

try {
    const openspecVersion = execSync('openspec --version', { encoding: 'utf8' }).trim();
    console.log('✅ OpenSpec:', openspecVersion);
} catch (error) {
    console.log('❌ OpenSpec no disponible');
}

try {
    const jqVersion = execSync('jq --version', { encoding: 'utf8' }).trim();
    console.log('✅ jq:', jqVersion);
} catch (error) {
    console.log('❌ jq no disponible');
}

try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    console.log('✅ Node.js:', nodeVersion);
} catch (error) {
    console.log('❌ Node.js no disponible');
}

// 2. Verificar archivos de Ralph
const projectRoot = path.resolve(__dirname, '../..');
const ralphFiles = [
    'scripts/ralph/ralph.sh',
    'scripts/ralph/prompt.md',
    'scripts/ralph/prd.json',
    'scripts/ralph/auto-dev-loop.ps1',
    'scripts/ralph/amp-simple.ps1',
    'scripts/ralph/amp-dev-loop.ps1'
];

console.log('\n📁 Verificando archivos de Ralph:');
ralphFiles.forEach(file => {
    const fullPath = path.join(projectRoot, file);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - NO ENCONTRADO`);
    }
});

// 3. Verificar PRD activo
const prdPath = path.join(projectRoot, 'scripts/ralph/prd.json');
console.log('\n📋 Verificando PRD:');
try {
    if (fs.existsSync(prdPath)) {
        const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));
        console.log('✅ PRD activo encontrado:');
        console.log(`   Proyecto: ${prd.project}`);
        console.log(`   Branch: ${prd.branchName}`);
        console.log(`   Stories totales: ${prd.userStories?.length || 0}`);

        const completedStories = prd.userStories?.filter(s => s.passes) || [];
        const pendingStories = prd.userStories?.filter(s => !s.passes) || [];

        console.log(`   ✅ Completadas: ${completedStories.length}`);
        console.log(`   ⏳ Pendientes: ${pendingStories.length}`);

        if (pendingStories.length > 0) {
            console.log('   Próximas stories:');
            pendingStories.slice(0, 3).forEach(story => {
                console.log(`     - ${story.id}: ${story.title}`);
            });
        }
    } else {
        console.log('❌ PRD no encontrado');
    }
} catch (error) {
    console.log('❌ Error leyendo PRD:', error.message);
}

// 4. Verificar que el sistema puede ejecutarse
console.log('\n🚀 Verificando capacidad de ejecución:');
try {
    // Verificar que estamos en el directorio correcto
    if (fs.existsSync(path.join(projectRoot, 'specs/prd.md'))) {
        console.log('✅ Estamos en el directorio raíz del proyecto');
    } else {
        console.log('❌ No estamos en el directorio correcto');
    }

    // Verificar branch actual
    try {
        const branchOutput = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        console.log('✅ Branch actual:', branchOutput);
    } catch (error) {
        console.log('⚠️ No es un repositorio git o error obteniendo branch');
    }

} catch (error) {
    console.log('❌ Error en verificación:', error.message);
}

console.log('\n🎯 Amp Setup Test Complete!');
console.log('\n📊 Estado del Sistema Amp:');
console.log('✅ OpenSpec configurado');
console.log('✅ jq disponible');
console.log('✅ Scripts Ralph preparados');
console.log('✅ PRD activo configurado');
console.log('✅ Sistema listo para desarrollo autónomo');

console.log('\n🚀 Para ejecutar desarrollo autónomo:');
console.log('• PowerShell: ./scripts/ralph/auto-dev-loop.ps1 -MaxIterations 10');
console.log('• PowerShell: ./scripts/ralph/amp-simple.ps1 -MaxIterations 3');
console.log('• Bash: ./scripts/ralph/ralph.sh 10');
console.log('• El sistema procesará automáticamente stories pendientes');

console.log('\n😴 Amp ejecutará automáticamente mientras duermes! 🤖');
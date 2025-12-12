/**
 * Analizador interactivo de Supabase
 * Permite ejecutar queries y comparar resultados de forma interactiva
 */

import { analyzeData, compareQueries, showStats, supabase } from './analyze-supabase.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔍 Analizador Interactivo de Supabase');
  console.log('='.repeat(60));
  console.log('Escribe "help" para ver comandos disponibles\n');

  while (true) {
    const command = await question('\n> ');

    if (command === 'exit' || command === 'quit') {
      console.log('👋 ¡Hasta luego!');
      break;
    }

    if (command === 'help') {
      console.log(`
📚 Comandos disponibles:

1. ANALIZAR TABLA:
   analyze <tabla> [filtros] [select] [orderBy] [limit]
   
   Ejemplo:
   analyze issues assignee_id=123 id,summary,current_story_points created_date:desc 10

2. COMPARAR QUERIES:
   compare <tabla1> <filtros1> <tabla2> <filtros2>
   
   Ejemplo:
   compare issues assignee_id=123 issues assignee_id=456

3. ESTADÍSTICAS:
   stats <tabla> [groupBy]
   
   Ejemplo:
   stats issues assignee_id

4. TABLAS DISPONIBLES:
   tables

5. SALIR:
   exit o quit
      `);
      continue;
    }

    if (command === 'tables') {
      console.log('\n📋 Tablas disponibles:');
      console.log('  - squads');
      console.log('  - initiatives');
      console.log('  - issues');
      console.log('  - developers');
      console.log('  - sprints');
      console.log('  - issue_sprints');
      console.log('  - v_sprint_metrics_complete (vista)');
      continue;
    }

    if (command.startsWith('analyze ')) {
      const parts = command.substring(8).trim().split(' ');
      const table = parts[0];
      const filters = {};
      let select = '*';
      let orderBy = null;
      let limit = null;

      // Parsear filtros, select, orderBy, limit
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part.includes('=')) {
          const [key, value] = part.split('=');
          filters[key] = isNaN(value) ? value : Number(value);
        } else if (part.includes(',')) {
          select = part;
        } else if (part.includes(':')) {
          orderBy = part;
        } else if (!isNaN(part)) {
          limit = Number(part);
        }
      }

      const results = await analyzeData({ table, filters, select, orderBy, limit });
      if (results && results.length > 0) {
        console.table(results.slice(0, 20));
      }
      continue;
    }

    if (command.startsWith('stats ')) {
      const parts = command.substring(6).trim().split(' ');
      const table = parts[0];
      const groupBy = parts[1] || null;
      await showStats(table, groupBy);
      continue;
    }

    if (command.startsWith('compare ')) {
      console.log('⚠️  Comparación interactiva - usa las funciones directamente en el código');
      console.log('Ejemplo:');
      console.log(`
import { compareQueries } from './scripts/analyze-supabase.js';

const result = await compareQueries(
  { table: 'issues', filters: { assignee_id: '123' } },
  { table: 'issues', filters: { assignee_id: '456' } }
);
      `);
      continue;
    }

    console.log('❌ Comando no reconocido. Escribe "help" para ver comandos disponibles.');
  }

  rl.close();
}

main().catch(console.error);

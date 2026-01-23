/**
 * TEST: Lógica de Membresía de Sprint
 *
 * Prueba la nueva lógica corregida sin necesidad de credenciales reales
 * Muestra cómo funciona la función wasTicketInSprintAtClose
 */

import { logger } from '../src/utils/logger.js';
import { wasTicketInSprintAtClose } from '../src/processors/issue-processor.js';

// Datos de ejemplo para testing
const mockSprintData = [
  { name: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-15', completeDate: '2024-01-14' },
  { name: 'Sprint 2', startDate: '2024-01-16', endDate: '2024-01-30', completeDate: '2024-01-29' }
];

// Changelog simulado - Issue removido del Sprint 2 antes del cierre
const mockChangelogRemoved = {
  histories: [
    {
      created: '2024-01-25T10:00:00.000+0000', // Dentro del Sprint 2
      items: [{
        field: 'Sprint',
        fromString: 'Sprint 1, Sprint 2',
        toString: 'Sprint 1'
      }]
    }
  ]
};

// Changelog simulado - Issue agregado al Sprint 2 después del inicio
const mockChangelogAddedLate = {
  histories: [
    {
      created: '2024-01-20T10:00:00.000+0000', // Después del inicio del Sprint 2
      items: [{
        field: 'Sprint',
        fromString: 'Sprint 1',
        toString: 'Sprint 1, Sprint 2'
      }]
    }
  ]
};

// Changelog simulado - Issue que estuvo en Sprint 2 todo el tiempo
const mockChangelogAlwaysIn = {
  histories: [
    // Sin cambios durante el sprint
  ]
};

// Changelog vacío (sin historial)
const mockChangelogEmpty = {
  histories: []
};

async function testSprintMembershipLogic() {
  logger.info('🧪 TESTANDO LÓGICA DE MEMBRESÍA DE SPRINT');
  logger.info('=' .repeat(60));

  const testCases = [
    {
      name: 'Issue removido antes del cierre',
      changelog: mockChangelogRemoved,
      sprint: mockSprintData[1], // Sprint 2
      expected: false,
      description: 'Issue fue removido del Sprint 2 el día 25, antes del cierre (29)'
    },
    {
      name: 'Issue agregado después del inicio',
      changelog: mockChangelogAddedLate,
      sprint: mockSprintData[1], // Sprint 2
      expected: true,
      description: 'Issue fue agregado al Sprint 2 el día 20 (después del inicio del 16)'
    },
    {
      name: 'Issue siempre en sprint',
      changelog: mockChangelogAlwaysIn,
      sprint: mockSprintData[1], // Sprint 2
      expected: false,
      description: 'Sin changelog = excluido por seguridad (nueva lógica conservadora)'
    },
    {
      name: 'Sin changelog disponible',
      changelog: mockChangelogEmpty,
      sprint: mockSprintData[1], // Sprint 2
      expected: false,
      description: 'Sin historial = excluido por seguridad'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    logger.info(`\n${i + 1}. ${testCase.name}`);
    logger.info(`   Descripción: ${testCase.description}`);

    try {
      const result = wasTicketInSprintAtClose(
        testCase.changelog,
        testCase.sprint.name,
        testCase.sprint.startDate,
        testCase.sprint.completeDate || testCase.sprint.endDate,
        [] // Sin datos actuales para evitar sesgo
      );

      const passed = result === testCase.expected;
      const status = passed ? '✅ PASS' : '❌ FAIL';

      logger.info(`   Resultado: ${result} (esperado: ${testCase.expected}) - ${status}`);

      if (passed) {
        passedTests++;
      } else {
        logger.error(`   ❌ ERROR: Se esperaba ${testCase.expected} pero se obtuvo ${result}`);
      }

    } catch (error) {
      logger.error(`   💥 ERROR ejecutando test: ${error.message}`);
    }
  }

  logger.info('\n' + '=' .repeat(60));
  logger.info('📊 RESULTADOS DEL TEST');
  logger.info('=' .repeat(60));
  logger.info(`Tests ejecutados: ${totalTests}`);
  logger.info(`Tests aprobados: ${passedTests}`);
  logger.info(`Tests fallidos: ${totalTests - passedTests}`);

  if (passedTests === totalTests) {
    logger.success('🎉 TODOS LOS TESTS APROBADOS');
    logger.success('✅ La nueva lógica funciona correctamente');
  } else {
    logger.error('⚠️ Algunos tests fallaron - revisar implementación');
  }

  logger.info('\n💡 EXPLICACIÓN DE LA NUEVA LÓGICA:');
  logger.info('   • Estado inicial: NO estaba en sprint (conservador)');
  logger.info('   • Solo changelog determina membresía real');
  logger.info('   • Sin historial = excluido por seguridad');
  logger.info('   • Cambios explícitos: agregado vs removido');

  logger.info('\n🚀 PRÓXIMOS PASOS:');
  logger.info('   1. Configurar credenciales reales en .env');
  logger.info('   2. Ejecutar: npm run auditoria-sprint-membership');
  logger.info('   3. Revisar resultados y proceder con limpieza si es necesario');
}

// Ejecutar tests
testSprintMembershipLogic();
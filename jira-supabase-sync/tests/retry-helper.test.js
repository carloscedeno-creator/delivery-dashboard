/**
 * Tests para retry-helper.js
 * Valida el comportamiento de retry con exponential backoff y manejo de rate limiting
 * Usa Node.js test runner nativo
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { retryWithBackoff, delayBetweenPages } from '../src/utils/retry-helper.js';

describe('retry-helper', () => {
  describe('retryWithBackoff', () => {
    test('debe ejecutar función exitosa sin reintentos', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'success';
      };
      
      const result = await retryWithBackoff(fn, { initialDelay: 10 });
      
      assert.strictEqual(result, 'success');
      assert.strictEqual(callCount, 1);
    });

    test('debe reintentar en caso de error temporal (500)', async () => {
      let attemptCount = 0;
      const fn = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          const error = new Error('Server Error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { maxRetries: 5, initialDelay: 10 });
      
      assert.strictEqual(result, 'success');
      assert.strictEqual(attemptCount, 3);
    });

    test('debe manejar rate limiting (429) respetando retry-after header', async () => {
      let attemptCount = 0;
      const fn = async () => {
        attemptCount++;
        if (attemptCount === 1) {
          const error = new Error('Rate Limited');
          error.response = {
            status: 429,
            headers: { 'retry-after': '1' }, // 1 segundo
          };
          throw error;
        }
        return 'success';
      };

      const startTime = Date.now();
      const result = await retryWithBackoff(fn, { maxRetries: 5, initialDelay: 10 });
      const elapsedTime = Date.now() - startTime;

      assert.strictEqual(result, 'success');
      assert.strictEqual(attemptCount, 2);
      // Debe haber esperado aproximadamente 1 segundo según retry-after
      assert.ok(elapsedTime >= 900, `Elapsed time should be >= 900ms, got ${elapsedTime}ms`);
      assert.ok(elapsedTime < 2000, `Elapsed time should be < 2000ms, got ${elapsedTime}ms`);
    });

    test('NO debe reintentar errores permanentes (400, 401, 403, 404)', async () => {
      const nonRetryableStatuses = [400, 401, 403, 404];
      
      for (const status of nonRetryableStatuses) {
        let callCount = 0;
        const fn = async () => {
          callCount++;
          const error = new Error('Client Error');
          error.response = { status };
          throw error;
        };

        try {
          await retryWithBackoff(fn, { maxRetries: 5, initialDelay: 10 });
          assert.fail('Should have thrown an error');
        } catch (error) {
          assert.strictEqual(callCount, 1); // Solo un intento, sin retry
        }
      }
    });

    test('debe usar exponential backoff para errores temporales', async () => {
      let attemptCount = 0;
      const delays = [];
      let lastTime = Date.now();

      const fn = async () => {
        attemptCount++;
        const currentTime = Date.now();
        if (attemptCount > 1) {
          delays.push(currentTime - lastTime);
        }
        lastTime = currentTime;

        if (attemptCount < 4) {
          const error = new Error('Server Error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      };

      await retryWithBackoff(fn, {
        maxRetries: 5,
        initialDelay: 100,
        backoffMultiplier: 2,
      });

      assert.strictEqual(attemptCount, 4);
      // Verificar que los delays aumentan exponencialmente
      assert.ok(delays[0] >= 90 && delays[0] < 150, `First delay should be ~100ms, got ${delays[0]}ms`);
      assert.ok(delays[1] >= 180 && delays[1] < 250, `Second delay should be ~200ms, got ${delays[1]}ms`);
      assert.ok(delays[2] >= 380 && delays[2] < 450, `Third delay should be ~400ms, got ${delays[2]}ms`);
    });

    test('debe lanzar error después de agotar todos los reintentos', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        const error = new Error('Server Error');
        error.response = { status: 500 };
        throw error;
      };

      try {
        await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
        assert.fail('Should have thrown an error');
      } catch (error) {
        // Debe haber intentado maxRetries + 1 veces (intento inicial + 3 reintentos)
        assert.strictEqual(callCount, 4);
      }
    });
  });

  describe('delayBetweenPages', () => {
    test('debe esperar el delay especificado', async () => {
      const delayMs = 100;
      const startTime = Date.now();
      
      await delayBetweenPages(delayMs);
      
      const elapsedTime = Date.now() - startTime;
      assert.ok(elapsedTime >= 90, `Elapsed time should be >= 90ms, got ${elapsedTime}ms`);
      assert.ok(elapsedTime < 150, `Elapsed time should be < 150ms, got ${elapsedTime}ms`);
    });

    test('debe usar delay por defecto de 200ms si no se especifica', async () => {
      const startTime = Date.now();
      
      await delayBetweenPages();
      
      const elapsedTime = Date.now() - startTime;
      assert.ok(elapsedTime >= 190, `Elapsed time should be >= 190ms, got ${elapsedTime}ms`);
      assert.ok(elapsedTime < 250, `Elapsed time should be < 250ms, got ${elapsedTime}ms`);
    });
  });
});

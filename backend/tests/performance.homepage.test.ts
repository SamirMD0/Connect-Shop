import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { it } from 'node:test';
import type { Request, Response } from 'express';

const logs: Array<Record<string, unknown>> = [];
const loggerId = require.resolve('../src/utils/logger');
require.cache[loggerId] = {
  id: loggerId, filename: loggerId, loaded: true,
  exports: { logger: { info: (fields: Record<string, unknown>) => logs.push(fields) } },
} as NodeModule;
const { performanceRequestLogger } = require('../src/utils/performance') as typeof import('../src/utils/performance');

it('logs the first usable finished GET once, then warm responses, independent of the slow threshold', () => {
  const previousEnabled = process.env.PERF_LOGGING_ENABLED;
  const previousThreshold = process.env.PERF_SLOW_REQUEST_MS;
  process.env.PERF_SLOW_REQUEST_MS = '999999';
  function response(successful: boolean, statusCode = 200, method = 'GET', finish = true) {
    const res = Object.assign(new EventEmitter(), {
      statusCode, locals: { homepageAggregateSuccessful: successful },
    });
    let nextCalls = 0;
    performanceRequestLogger({ method, path: '/api/v1/homepage/full', id: 'synthetic' } as Request,
      res as unknown as Response, () => { nextCalls += 1; });
    assert.equal(nextCalls, 1);
    res.emit(finish ? 'finish' : 'close');
  }
  try {
    process.env.PERF_LOGGING_ENABLED = 'false';
    response(true);
    assert.equal(logs.length, 0);
    process.env.PERF_LOGGING_ENABLED = 'true';
    response(false); // Essential failures must leave the first marker available.
    response(true, 500);
    response(true, 200, 'HEAD');
    response(true, 200, 'GET', false); // Aborted response.
    assert.equal(logs.length, 0);
    response(true);
    response(true);
    assert.deepEqual(logs.map(log => log.homepageResponse), ['first', 'warm']);
    assert.equal(logs[0].startupPhase, 'first_homepage');
    assert.equal(logs[1].startupPhase, undefined);
    for (const log of logs) {
      assert.ok(typeof log.durationMs === 'number' && log.durationMs >= 0);
      assert.ok(typeof log.processElapsedMs === 'number' && log.processElapsedMs >= 0);
      assert.equal(log.requestId, 'synthetic');
    }
  } finally {
    if (previousEnabled === undefined) delete process.env.PERF_LOGGING_ENABLED;
    else process.env.PERF_LOGGING_ENABLED = previousEnabled;
    if (previousThreshold === undefined) delete process.env.PERF_SLOW_REQUEST_MS;
    else process.env.PERF_SLOW_REQUEST_MS = previousThreshold;
  }
});

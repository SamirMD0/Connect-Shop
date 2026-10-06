import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { measureHomepageAggregateRequest } from '../../src/lib/perf';

describe('homepage aggregate timing', () => {
  const originalInfo = console.info;
  const originalPerfLogging = process.env.PERF_LOGGING_ENABLED;
  let logs: unknown[][];

  beforeEach(() => {
    logs = [];
    console.info = (...args: unknown[]) => { logs.push(args); };
    process.env.PERF_LOGGING_ENABLED = 'true';
  });

  afterEach(() => {
    console.info = originalInfo;
    if (originalPerfLogging === undefined) delete process.env.PERF_LOGGING_ENABLED;
    else process.env.PERF_LOGGING_ENABLED = originalPerfLogging;
  });

  it('returns the original result and records one successful operation', async () => {
    const result = { fixture: 'synthetic response data' };
    let calls = 0;
    assert.equal(await measureHomepageAggregateRequest(async () => {
      calls++;
      return result;
    }), result);
    assert.equal(calls, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], '[perf][frontend][homepage-aggregate]');
    const fields = logs[0][1] as Record<string, unknown>;
    assert.deepEqual(Object.keys(fields).sort(), ['durationMs', 'endpoint', 'outcome']);
    assert.equal(fields.endpoint, '/api/v1/homepage/full');
    assert.equal(fields.outcome, 'success');
    assert.ok(typeof fields.durationMs === 'number' && fields.durationMs >= 0);
  });

  it('records failures without logging error contents or changing the rejection', async () => {
    const failure = new Error('synthetic sensitive error content');
    await assert.rejects(measureHomepageAggregateRequest(async () => { throw failure; }),
      (error: unknown) => error === failure);
    assert.equal(logs.length, 1);
    assert.equal((logs[0][1] as Record<string, unknown>).outcome, 'failed');
    assert.ok(!JSON.stringify(logs).includes(failure.message));
  });

  it('records warm operations even below existing slow thresholds', async () => {
    const previousThreshold = process.env.PERF_SLOW_FETCH_MS;
    process.env.PERF_SLOW_FETCH_MS = '999999';
    try {
      await measureHomepageAggregateRequest(async () => undefined);
      assert.equal(logs.length, 1);
    } finally {
      if (previousThreshold === undefined) delete process.env.PERF_SLOW_FETCH_MS;
      else process.env.PERF_SLOW_FETCH_MS = previousThreshold;
    }
  });

  it('does not log when performance logging is disabled', async () => {
    process.env.PERF_LOGGING_ENABLED = 'false';
    assert.equal(await measureHomepageAggregateRequest(async () => 'result'), 'result');
    assert.deepEqual(logs, []);
  });
});

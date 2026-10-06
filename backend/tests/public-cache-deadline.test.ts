import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { DeadlineError, withDeadline } from '../src/utils/deadline';

// Stub every environment/service dependency BEFORE importing the real helpers.
// No dotenv, socket, database, or real Redis command is created by this suite.
function stub(path: string, exports: unknown) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule;
}
const never = () => new Promise<never>(() => {});
class FakeRedis {
  static instances: FakeRedis[] = [];
  status = 'ready'; calls: unknown[][] = []; connections = 0; disconnects = 0;
  getResult: () => Promise<string | null> = async () => null;
  setResult: () => Promise<string> = async () => 'OK';
  delResult: () => Promise<number> = async () => 1;
  constructor(public url: string, public options: Record<string, unknown>) { FakeRedis.instances.push(this); }
  on() { return this; }
  async connect() { this.connections++; this.status = 'connecting'; }
  disconnect() { this.disconnects++; this.status = 'end'; }
  get(key: string) { this.calls.push(['get', key]); return this.getResult(); }
  setex(key: string, ttl: number, value: string) { this.calls.push(['setex', key, ttl, value]); return this.setResult(); }
  del(...keys: string[]) { this.calls.push(['del', ...keys]); return this.delResult(); }
}
stub('ioredis', { Redis: FakeRedis });
stub('../src/config/env', { env: { NODE_ENV: 'development', REDIS_URL: 'redis://127.0.0.1:1', REDIS_CACHE_TIMEOUT_MS: 15 } });
stub('../src/utils/logger', { logger: { info() {}, warn() {} } });
stub('../src/utils/performance', { recordCacheMetric() {} });
const { cacheGet, cacheSetEx, getJsonCache, cacheDel } = require('../src/config/redis') as typeof import('../src/config/redis');
const [sensitive, cache] = FakeRedis.instances;

describe('public cache deadlines', () => {
  beforeEach(() => {
    cache.status = 'ready'; cache.calls = []; cache.disconnects = 0; cache.connections = 0;
    sensitive.calls = [];
    cache.getResult = async () => null; cache.setResult = async () => 'OK'; cache.delResult = async () => 1;
  });
  it('isolates public cache bounds from rate limiting and existing invalidation commands', async () => {
    assert.deepEqual(sensitive.options, { maxRetriesPerRequest: 1 });
    assert.equal(cache.options.enableOfflineQueue, false);
    assert.equal(cache.options.autoResendUnfulfilledCommands, false);
    assert.equal(cache.options.maxRetriesPerRequest, 0);
    assert.equal((cache.options.retryStrategy as () => null)(), null);
    await cacheDel('fixture');
    assert.deepEqual(sensitive.calls, [['del', 'fixture']]); assert.deepEqual(cache.calls, []);
  });
  it('treats a hung GET as a bounded miss, disconnects it, and bypasses during cooldown', async () => {
    cache.getResult = never;
    assert.equal(await cacheGet('fixture'), null);
    assert.equal(cache.disconnects, 1);
    assert.equal(await cacheGet('fixture'), null);
    assert.deepEqual(cache.calls, [['get', 'fixture']]); assert.equal(cache.connections, 0);
  });
  it('bounds a hung SET and never queues or retries that write after reconnect', async () => {
    cache.setResult = never;
    await cacheSetEx('fixture', 60, 'synthetic');
    assert.equal(cache.disconnects, 1);
    await cacheSetEx('fixture', 60, 'synthetic');
    assert.deepEqual(cache.calls, [['setex', 'fixture', 60, 'synthetic']]);
    assert.deepEqual(sensitive.calls, []);
  });
  it('falls back on command rejection without changing successful TTLs or values', async () => {
    await cacheSetEx('fixture', 180, 'synthetic');
    assert.deepEqual(cache.calls, [['setex', 'fixture', 180, 'synthetic']]);
    cache.getResult = async () => { throw new Error('synthetic unavailable'); };
    assert.equal(await cacheGet('fixture'), null); assert.equal(cache.disconnects, 1);
  });
  it('does not issue commands while connecting', async () => {
    cache.status = 'connecting';
    assert.equal(await cacheGet('fixture'), null); await cacheSetEx('fixture', 60, 'synthetic');
    assert.deepEqual(cache.calls, []); assert.equal(cache.connections, 0);
  });
  it('bounds corrupt-JSON cleanup instead of waiting on shared invalidation', async () => {
    cache.getResult = async () => '{invalid'; cache.delResult = never;
    assert.equal(await getJsonCache('fixture'), null);
    assert.deepEqual(cache.calls, [['get', 'fixture'], ['del', 'fixture']]);
    assert.equal(cache.disconnects, 1); assert.deepEqual(sensitive.calls, []);
  });
  it('reconnects only on demand after cooldown, without replaying commands', async () => {
    const now = Date.now;
    let clock = now() + 6000;
    Date.now = () => clock;
    try {
      cache.status = 'end';
      assert.equal(await cacheGet('fixture'), null);
      assert.equal(cache.connections, 1); assert.deepEqual(cache.calls, []);
      cache.status = 'end'; clock += 1000;
      assert.equal(await cacheGet('fixture'), null); assert.equal(cache.connections, 1);
      clock += 5000;
      assert.equal(await cacheGet('fixture'), null); assert.equal(cache.connections, 2);
      cache.status = 'ready'; await cacheSetEx('new', 60, 'new-value');
      assert.deepEqual(cache.calls, [['setex', 'new', 60, 'new-value']]);
    } finally { Date.now = now; }
  });

  it('returns valid cache data unchanged', async () => {
    cache.getResult = async () => JSON.stringify({ products: [], synthetic: true });
    assert.deepEqual(await getJsonCache('fixture'), { products: [], synthetic: true });
    assert.equal(cache.disconnects, 0);
  });
  it('a deadline rejects even when cancellation is unsupported or throws', async () => {
    await assert.rejects(withDeadline(never, 15, () => { throw new Error('cancellation unavailable'); }), DeadlineError);
    assert.equal(await withDeadline(async () => 'success', 15), 'success');
  });
});

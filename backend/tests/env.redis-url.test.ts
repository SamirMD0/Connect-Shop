import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { optionalRedisUrl } from '../src/config/redisUrl';

describe('optional REDIS_URL validation', () => {
  it('accepts an absent value', () => {
    assert.equal(optionalRedisUrl.parse(undefined), undefined);
  });

  it('normalizes an empty value to absent', () => {
    assert.equal(optionalRedisUrl.parse(''), undefined);
  });

  it('normalizes whitespace-only values to absent', () => {
    for (const value of [' ', '\t', '\r\n', ' \t\r\n ']) {
      assert.equal(optionalRedisUrl.parse(value), undefined);
    }
  });

  it('preserves valid nonempty URLs', () => {
    for (const value of ['redis://localhost:6379', 'rediss://localhost:6380/0']) {
      assert.equal(optionalRedisUrl.parse(value), value);
    }
  });

  it('rejects malformed nonempty values', () => {
    for (const value of ['not-a-url', 'localhost', 'redis://[invalid', '  invalid value  ']) {
      assert.equal(optionalRedisUrl.safeParse(value).success, false);
    }
  });
});

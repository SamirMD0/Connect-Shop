import { z } from 'zod';

// Preserve nonempty values so URL validation still rejects malformed input.
export const optionalRedisUrl = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().url().optional()
);

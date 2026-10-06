import type { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db';

export async function lockUserCart(client: PoolClient, userId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', ['cart:' + userId.toLowerCase()]);
}

export function withCartMutation<T>(userId: string, work: (read: typeof query) => Promise<T>): Promise<T> {
  return withTransaction(async (client) => {
    await lockUserCart(client, userId);
    const read: typeof query = async (sql, values) => (await client.query(sql, values)).rows;
    return work(read);
  });
}

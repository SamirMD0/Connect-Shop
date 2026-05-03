import { pool } from '../src/config/db';

async function main() {
  try {
    console.log('Connecting to DB to remove all categories...');
    
    // Using TRUNCATE CASCADE because products depend on categories with NOT NULL.
    // This will wipe categories and products.
    await pool.query('TRUNCATE categories CASCADE');
    
    console.log('✅ Successfully removed all categories (and cascading products).');
  } catch (error) {
    console.error('❌ Error removing categories:', error);
  } finally {
    await pool.end();
  }
}

main();

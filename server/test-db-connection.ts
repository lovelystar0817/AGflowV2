import { db } from './db';
import { sql } from 'drizzle-orm';

async function testConnection() {
  try {
    // List tables in the database using drizzle-orm's sql
    const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log('Tables:', result);
    return result;
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
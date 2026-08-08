import { readFile, readdir } from 'node:fs/promises';

import { pool } from './pool.js';

const migrationsUrl = new URL('./migrations/', import.meta.url);

export async function migrate(database = pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsUrl))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const alreadyApplied = await database.query(
      'SELECT 1 FROM schema_migrations WHERE name = $1',
      [file],
    );

    if (alreadyApplied.rowCount > 0) continue;

    const sql = await readFile(new URL(file, migrationsUrl), 'utf8');
    const client = await database.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied migration ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  migrate()
    .then(() => pool.end())
    .catch(async (error) => {
      console.error(error);
      await pool.end();
      process.exitCode = 1;
    });
}

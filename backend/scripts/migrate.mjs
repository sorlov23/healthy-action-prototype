import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, '../migrations');

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const name of files) {
    const exists = await client.query('select 1 from schema_migrations where name = $1', [name]);
    if (exists.rowCount) {
      console.log(`skip ${name}`);
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, name), 'utf8');
    console.log(`apply ${name}`);
    await client.query('begin');
    try {
      await client.query(sql);
      await client.query('insert into schema_migrations(name) values($1)', [name]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }

  console.log('migrations complete');
} finally {
  await client.end();
}

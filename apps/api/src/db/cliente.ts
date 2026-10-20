import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { Database as BancoSqlite } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env.ts';
import * as schema from './schema.ts';

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

export const sqlite: BancoSqlite = new Database(env.dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema, casing: 'snake_case' });
export { schema };

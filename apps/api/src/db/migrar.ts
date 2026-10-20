import path from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './cliente.ts';
import { aplicarFts } from './fts.ts';

export function migrarBanco(): void {
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
  aplicarFts(sqlite);
}

if (process.argv[1]?.endsWith('migrar.ts')) {
  migrarBanco();
  console.log('Migrations aplicadas e FTS5 em dia.');
  sqlite.close();
}

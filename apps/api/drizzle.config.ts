import { defineConfig } from 'drizzle-kit';
import path from 'node:path';

const url = process.env.DATABASE_URL ?? './data/estudos.db';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: path.resolve(process.cwd(), '../..', url) },
  casing: 'snake_case',
});

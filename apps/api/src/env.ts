import path from 'node:path';
import process from 'node:process';
import { z } from 'zod';

const raiz = path.resolve(import.meta.dirname, '../../..');

const envSchema = z.object({
  PDF_DIR: z.string().min(1, 'defina PDF_DIR no .env'),
  DATABASE_URL: z.string().default('./data/estudos.db'),
  API_PORT: z.coerce.number().int().default(3333),
  API_HOST: z.string().default('0.0.0.0'),
  PISTON_URL: z.string().default('http://localhost:2000'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const dados = parsed.data;

export const env = {
  ...dados,
  /** Pasta dos PDFs. SOMENTE LEITURA: a API nunca escreve aqui. */
  pdfDir: path.resolve(dados.PDF_DIR),
  dbPath: path.isAbsolute(dados.DATABASE_URL)
    ? dados.DATABASE_URL
    : path.resolve(raiz, dados.DATABASE_URL),
  raizProjeto: raiz,
  temIa: dados.GEMINI_API_KEY.length > 0,
};

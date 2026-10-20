import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/cliente.ts';
import { cacheIa } from '../db/schema.ts';

/** Cache de chamadas de IA em SQLite, para nao repetir a mesma pergunta. */

export function chaveCache(tarefa: string, modelo: string, entrada: unknown): string {
  return createHash('sha256')
    .update(`${tarefa}|${modelo}|${JSON.stringify(entrada)}`)
    .digest('hex');
}

export function lerCache<T>(chave: string): T | null {
  const linha = db.select().from(cacheIa).where(eq(cacheIa.chave, chave)).get();
  return linha ? (linha.resposta as T) : null;
}

export function gravarCache(
  chave: string,
  tarefa: string,
  modelo: string,
  resposta: unknown,
): void {
  db.insert(cacheIa)
    .values({ chave, tarefa, modelo, resposta })
    .onConflictDoUpdate({ target: cacheIa.chave, set: { resposta } })
    .run();
}

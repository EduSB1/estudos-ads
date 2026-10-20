import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { preferenciasSchema } from '@estudos/shared';
import type { Preferencias } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { preferencias } from '../db/schema.ts';

const CHAVE = 'app';

function ler(): Preferencias {
  const linha = db.select().from(preferencias).where(eq(preferencias.chave, CHAVE)).get();
  if (!linha) return preferenciasSchema.parse({});
  const parsed = preferenciasSchema.safeParse(JSON.parse(linha.valor));
  return parsed.success ? parsed.data : preferenciasSchema.parse({});
}

export const rotasPreferencias: FastifyPluginAsync = async (app) => {
  app.get('/preferencias', async () => ler());

  app.put('/preferencias', async (req) => {
    const novas = preferenciasSchema.parse({ ...ler(), ...(req.body as object) });
    db.insert(preferencias)
      .values({ chave: CHAVE, valor: JSON.stringify(novas) })
      .onConflictDoUpdate({
        target: preferencias.chave,
        set: { valor: JSON.stringify(novas), atualizadoEm: new Date().toISOString() },
      })
      .run();
    return novas;
  });

  /** GET /saude — usado pelo healthcheck do Docker. */
  app.get('/saude', async () => ({ ok: true, agora: new Date().toISOString() }));
};

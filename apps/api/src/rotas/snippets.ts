import { desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { atualizarSnippetSchema, criarSnippetSchema } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { snippets } from '../db/schema.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasSnippets: FastifyPluginAsync = async (app) => {
  app.get('/snippets', async (req) => {
    const q = z
      .object({ documentoId: z.coerce.number().int().positive().optional() })
      .parse(req.query);
    return db
      .select()
      .from(snippets)
      .where(q.documentoId ? eq(snippets.documentoId, q.documentoId) : undefined)
      .orderBy(desc(snippets.atualizadoEm))
      .all();
  });

  app.get('/snippets/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const snippet = db.select().from(snippets).where(eq(snippets.id, id)).get();
    if (!snippet) return reply.code(404).send({ erro: 'snippet nao encontrado' });
    return snippet;
  });

  app.post('/snippets', async (req, reply) => {
    const dados = criarSnippetSchema.parse(req.body);
    const criado = db
      .insert(snippets)
      .values({
        titulo: dados.titulo,
        linguagem: dados.linguagem,
        codigo: dados.codigo,
        documentoId: dados.documentoId ?? null,
        materiaId: dados.materiaId ?? null,
        pagina: dados.pagina ?? null,
      })
      .returning()
      .get();
    return reply.code(201).send(criado);
  });

  app.patch('/snippets/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const dados = atualizarSnippetSchema.parse(req.body);
    const atualizado = db
      .update(snippets)
      .set({
        ...(dados.titulo !== undefined ? { titulo: dados.titulo } : {}),
        ...(dados.linguagem !== undefined ? { linguagem: dados.linguagem } : {}),
        ...(dados.codigo !== undefined ? { codigo: dados.codigo } : {}),
        atualizadoEm: new Date().toISOString(),
      })
      .where(eq(snippets.id, id))
      .returning()
      .get();
    if (!atualizado) return reply.code(404).send({ erro: 'snippet nao encontrado' });
    return atualizado;
  });

  app.delete('/snippets/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    db.delete(snippets).where(eq(snippets.id, id)).run();
    return reply.code(204).send();
  });
};

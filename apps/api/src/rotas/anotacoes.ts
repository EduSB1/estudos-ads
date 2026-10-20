import { and, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { atualizarAnotacaoSchema, criarAnotacaoSchema } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { anotacoes } from '../db/schema.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasAnotacoes: FastifyPluginAsync = async (app) => {
  /** GET /anotacoes?documentoId=&materiaId= */
  app.get('/anotacoes', async (req) => {
    const q = z
      .object({
        documentoId: z.coerce.number().int().positive().optional(),
        materiaId: z.coerce.number().int().positive().optional(),
      })
      .parse(req.query);

    const filtros = [
      q.documentoId ? eq(anotacoes.documentoId, q.documentoId) : undefined,
      q.materiaId ? eq(anotacoes.materiaId, q.materiaId) : undefined,
    ].filter(Boolean);

    return db
      .select()
      .from(anotacoes)
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(desc(anotacoes.atualizadoEm))
      .all();
  });

  app.post('/anotacoes', async (req, reply) => {
    const dados = criarAnotacaoSchema.parse(req.body);
    const criada = db
      .insert(anotacoes)
      .values({
        materiaId: dados.materiaId ?? null,
        documentoId: dados.documentoId ?? null,
        titulo: dados.titulo ?? null,
        conteudoHtml: dados.conteudoHtml,
        conteudoTexto: dados.conteudoTexto,
      })
      .returning()
      .get();
    return reply.code(201).send(criada);
  });

  app.patch('/anotacoes/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const dados = atualizarAnotacaoSchema.parse(req.body);

    const atualizada = db
      .update(anotacoes)
      .set({
        ...(dados.titulo !== undefined ? { titulo: dados.titulo ?? null } : {}),
        ...(dados.conteudoHtml !== undefined ? { conteudoHtml: dados.conteudoHtml } : {}),
        ...(dados.conteudoTexto !== undefined ? { conteudoTexto: dados.conteudoTexto } : {}),
        atualizadoEm: new Date().toISOString(),
      })
      .where(eq(anotacoes.id, id))
      .returning()
      .get();

    if (!atualizada) return reply.code(404).send({ erro: 'anotacao nao encontrada' });
    return atualizada;
  });

  app.delete('/anotacoes/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    db.delete(anotacoes).where(eq(anotacoes.id, id)).run();
    return reply.code(204).send();
  });
};

import { and, asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { atualizarDestaqueSchema, criarDestaqueSchema } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { destaques, documentos, materias } from '../db/schema.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasDestaques: FastifyPluginAsync = async (app) => {
  app.get('/destaques', async (req) => {
    const q = z
      .object({ documentoId: z.coerce.number().int().positive().optional() })
      .parse(req.query);

    return db
      .select()
      .from(destaques)
      .where(q.documentoId ? eq(destaques.documentoId, q.documentoId) : undefined)
      .orderBy(asc(destaques.pagina), asc(destaques.id))
      .all();
  });

  /** GET /revisao — todos os destaques e lembretes, para a tela de revisao. */
  app.get('/revisao', async (req) => {
    const q = z.object({ apenasLembretes: z.coerce.boolean().default(false) }).parse(req.query);

    const filtro = q.apenasLembretes ? isNotNull(destaques.lembrete) : undefined;

    const itens = db
      .select({
        id: destaques.id,
        documentoId: destaques.documentoId,
        documentoTitulo: documentos.titulo,
        materiaId: materias.id,
        materiaNome: materias.nome,
        pagina: destaques.pagina,
        cor: destaques.cor,
        texto: destaques.texto,
        comentario: destaques.comentario,
        lembrete: destaques.lembrete,
        lembreteEm: destaques.lembreteEm,
        lembreteConcluido: destaques.lembreteConcluido,
        criadoEm: destaques.criadoEm,
      })
      .from(destaques)
      .innerJoin(documentos, eq(destaques.documentoId, documentos.id))
      .innerJoin(materias, eq(documentos.materiaId, materias.id))
      .where(filtro)
      .orderBy(desc(destaques.criadoEm))
      .all();

    return {
      total: itens.length,
      comLembrete: itens.filter((i) => i.lembrete).length,
      pendentes: itens.filter((i) => i.lembrete && !i.lembreteConcluido).length,
      itens,
    };
  });

  app.post('/destaques', async (req, reply) => {
    const dados = criarDestaqueSchema.parse(req.body);
    const criado = db
      .insert(destaques)
      .values({
        documentoId: dados.documentoId,
        pagina: dados.pagina,
        cor: dados.cor,
        texto: dados.texto,
        comentario: dados.comentario ?? null,
        posicao: dados.posicao ?? {},
        lembrete: dados.lembrete ?? null,
        lembreteEm: dados.lembreteEm ?? null,
      })
      .returning()
      .get();
    return reply.code(201).send(criado);
  });

  app.patch('/destaques/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const dados = atualizarDestaqueSchema.parse(req.body);

    const atualizado = db
      .update(destaques)
      .set({
        ...(dados.cor !== undefined ? { cor: dados.cor } : {}),
        ...(dados.comentario !== undefined ? { comentario: dados.comentario ?? null } : {}),
        ...(dados.lembrete !== undefined ? { lembrete: dados.lembrete ?? null } : {}),
        ...(dados.lembreteEm !== undefined ? { lembreteEm: dados.lembreteEm ?? null } : {}),
        ...(dados.lembreteConcluido !== undefined
          ? { lembreteConcluido: dados.lembreteConcluido }
          : {}),
      })
      .where(eq(destaques.id, id))
      .returning()
      .get();

    if (!atualizado) return reply.code(404).send({ erro: 'destaque nao encontrado' });
    return atualizado;
  });

  app.delete('/destaques/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    db.delete(destaques)
      .where(and(eq(destaques.id, id)))
      .run();
    return reply.code(204).send();
  });
};

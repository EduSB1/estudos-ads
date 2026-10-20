import { and, desc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { atualizarQuestaoSchema, criarQuestaoSchema, criarRespostaSchema } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { documentos, materias, questoes, respostas } from '../db/schema.ts';
import { impressaoDigital } from '../pdf/questoes.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasQuestoes: FastifyPluginAsync = async (app) => {
  /** GET /questoes?documentoId=&materiaId=&origem= */
  app.get('/questoes', async (req) => {
    const q = z
      .object({
        documentoId: z.coerce.number().int().positive().optional(),
        materiaId: z.coerce.number().int().positive().optional(),
        origem: z.enum(['heuristica', 'ia', 'manual']).optional(),
      })
      .parse(req.query);

    const filtros = [
      q.documentoId ? eq(questoes.documentoId, q.documentoId) : undefined,
      q.materiaId ? eq(questoes.materiaId, q.materiaId) : undefined,
      q.origem ? eq(questoes.origem, q.origem) : undefined,
    ].filter(Boolean);

    return db
      .select({
        id: questoes.id,
        documentoId: questoes.documentoId,
        documentoTitulo: documentos.titulo,
        materiaId: questoes.materiaId,
        materiaNome: materias.nome,
        pagina: questoes.pagina,
        numero: questoes.numero,
        enunciado: questoes.enunciado,
        alternativas: questoes.alternativas,
        gabarito: questoes.gabarito,
        explicacao: questoes.explicacao,
        origem: questoes.origem,
        revisada: questoes.revisada,
        criadoEm: questoes.criadoEm,
        totalRespostas: sql<number>`(
          select count(*) from ${respostas} where ${respostas.questaoId} = ${questoes.id}
        )`,
        ultimaMarcacao: sql<string | null>`(
          select ${respostas.marcacao} from ${respostas}
          where ${respostas.questaoId} = ${questoes.id}
          order by ${respostas.id} desc limit 1
        )`,
      })
      .from(questoes)
      .leftJoin(documentos, eq(questoes.documentoId, documentos.id))
      .leftJoin(materias, eq(questoes.materiaId, materias.id))
      .where(filtros.length ? and(...filtros) : undefined)
      .orderBy(questoes.pagina, questoes.id)
      .all();
  });

  app.post('/questoes', async (req, reply) => {
    const dados = criarQuestaoSchema.parse(req.body);
    const criada = db
      .insert(questoes)
      .values({
        documentoId: dados.documentoId ?? null,
        materiaId: dados.materiaId ?? null,
        pagina: dados.pagina ?? null,
        numero: dados.numero ?? null,
        enunciado: dados.enunciado,
        alternativas: dados.alternativas,
        gabarito: dados.gabarito ?? null,
        explicacao: dados.explicacao ?? null,
        origem: dados.origem,
        impressaoDigital: impressaoDigital(dados.documentoId ?? null, dados.enunciado),
      })
      .onConflictDoNothing({ target: questoes.impressaoDigital })
      .returning()
      .get();

    if (!criada) return reply.code(409).send({ erro: 'questao equivalente ja existe' });
    return reply.code(201).send(criada);
  });

  /** PATCH /questoes/:id — permite corrigir a mao o que a heuristica errou. */
  app.patch('/questoes/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const dados = atualizarQuestaoSchema.parse(req.body);

    const atualizada = db
      .update(questoes)
      .set({
        ...(dados.enunciado !== undefined ? { enunciado: dados.enunciado } : {}),
        ...(dados.alternativas !== undefined ? { alternativas: dados.alternativas } : {}),
        ...(dados.gabarito !== undefined ? { gabarito: dados.gabarito ?? null } : {}),
        ...(dados.explicacao !== undefined ? { explicacao: dados.explicacao ?? null } : {}),
        ...(dados.numero !== undefined ? { numero: dados.numero ?? null } : {}),
        ...(dados.revisada !== undefined ? { revisada: dados.revisada } : {}),
      })
      .where(eq(questoes.id, id))
      .returning()
      .get();

    if (!atualizada) return reply.code(404).send({ erro: 'questao nao encontrada' });
    return atualizada;
  });

  app.delete('/questoes/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    db.delete(questoes).where(eq(questoes.id, id)).run();
    return reply.code(204).send();
  });

  /** GET /questoes/:id/respostas — historico de tentativas. */
  app.get('/questoes/:id/respostas', async (req) => {
    const { id } = paramsId.parse(req.params);
    return db
      .select()
      .from(respostas)
      .where(eq(respostas.questaoId, id))
      .orderBy(desc(respostas.id))
      .all();
  });

  app.post('/respostas', async (req, reply) => {
    const dados = criarRespostaSchema.parse(req.body);
    const criada = db
      .insert(respostas)
      .values({
        questaoId: dados.questaoId,
        alternativa: dados.alternativa ?? null,
        texto: dados.texto ?? null,
        marcacao: dados.marcacao,
      })
      .returning()
      .get();
    return reply.code(201).send(criada);
  });
};

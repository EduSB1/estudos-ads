import { and, asc, eq, sql } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/cliente.ts';
import { documentos, materias, paginas } from '../db/schema.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasMaterias: FastifyPluginAsync = async (app) => {
  /** GET /materias — lista as materias com contagem de documentos e paginas. */
  app.get('/materias', async () => {
    const linhas = db
      .select({
        id: materias.id,
        slug: materias.slug,
        nome: materias.nome,
        semestre: materias.semestre,
        codigo: materias.codigo,
        caminho: materias.caminho,
        criadoEm: materias.criadoEm,
        totalDocumentos: sql<number>`count(distinct ${documentos.id})`,
        totalPaginas: sql<number>`coalesce(sum(${documentos.totalPaginas}), 0)`,
      })
      .from(materias)
      .leftJoin(documentos, eq(documentos.materiaId, materias.id))
      .groupBy(materias.id)
      .orderBy(asc(materias.nome))
      .all();

    return linhas;
  });

  /** GET /materias/:id */
  app.get('/materias/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const materia = db.select().from(materias).where(eq(materias.id, id)).get();
    if (!materia) return reply.code(404).send({ erro: 'materia nao encontrada' });
    return materia;
  });

  /** GET /materias/:id/documentos — documentos da materia, opcionalmente por categoria. */
  app.get('/materias/:id/documentos', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const query = z
      .object({ categoria: z.enum(['aulas', 'exercicios', 'provas', 'extras']).optional() })
      .parse(req.query);

    const materia = db.select().from(materias).where(eq(materias.id, id)).get();
    if (!materia) return reply.code(404).send({ erro: 'materia nao encontrada' });

    const filtro = query.categoria
      ? and(eq(documentos.materiaId, id), eq(documentos.categoria, query.categoria))
      : eq(documentos.materiaId, id);

    return db
      .select({
        id: documentos.id,
        materiaId: documentos.materiaId,
        titulo: documentos.titulo,
        arquivo: documentos.arquivo,
        caminho: documentos.caminho,
        totalPaginas: documentos.totalPaginas,
        tamanhoBytes: documentos.tamanhoBytes,
        categoria: documentos.categoria,
        status: documentos.status,
        precisaOcr: documentos.precisaOcr,
        ultimaPagina: documentos.ultimaPagina,
        ultimaLeituraEm: documentos.ultimaLeituraEm,
        indexadoEm: documentos.indexadoEm,
        totalPaginasIndexadas: sql<number>`(
          select count(*) from ${paginas} where ${paginas.documentoId} = ${documentos.id}
        )`,
      })
      .from(documentos)
      .where(filtro)
      .orderBy(asc(documentos.arquivo))
      .all();
  });
};

import fs from 'node:fs';
import path from 'node:path';
import { asc, desc, eq, isNotNull } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '../db/cliente.ts';
import { documentos, links, materias, paginas } from '../db/schema.ts';
import { env } from '../env.ts';

const paramsId = z.object({ id: z.coerce.number().int().positive() });

export const rotasDocumentos: FastifyPluginAsync = async (app) => {
  /** GET /documentos/recentes — alimenta o "retomar leitura" da tela inicial. */
  app.get('/documentos/recentes', async (req) => {
    const { limite } = z
      .object({ limite: z.coerce.number().int().min(1).max(20).default(5) })
      .parse(req.query);

    return db
      .select({
        id: documentos.id,
        titulo: documentos.titulo,
        caminho: documentos.caminho,
        totalPaginas: documentos.totalPaginas,
        ultimaPagina: documentos.ultimaPagina,
        ultimaLeituraEm: documentos.ultimaLeituraEm,
        materiaId: documentos.materiaId,
        materiaNome: materias.nome,
      })
      .from(documentos)
      .innerJoin(materias, eq(documentos.materiaId, materias.id))
      .where(isNotNull(documentos.ultimaLeituraEm))
      .orderBy(desc(documentos.ultimaLeituraEm))
      .limit(limite)
      .all();
  });

  app.get('/documentos/:id', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const doc = db
      .select({
        id: documentos.id,
        materiaId: documentos.materiaId,
        materiaNome: materias.nome,
        titulo: documentos.titulo,
        arquivo: documentos.arquivo,
        caminho: documentos.caminho,
        totalPaginas: documentos.totalPaginas,
        categoria: documentos.categoria,
        status: documentos.status,
        precisaOcr: documentos.precisaOcr,
        ultimaPagina: documentos.ultimaPagina,
        ultimaLeituraEm: documentos.ultimaLeituraEm,
      })
      .from(documentos)
      .innerJoin(materias, eq(documentos.materiaId, materias.id))
      .where(eq(documentos.id, id))
      .get();

    if (!doc) return reply.code(404).send({ erro: 'documento nao encontrado' });
    return doc;
  });

  /** GET /documentos/:id/arquivo — serve o PDF em modo leitura, sem sair de PDF_DIR. */
  app.get('/documentos/:id/arquivo', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const doc = db
      .select({ caminho: documentos.caminho, arquivo: documentos.arquivo })
      .from(documentos)
      .where(eq(documentos.id, id))
      .get();
    if (!doc) return reply.code(404).send({ erro: 'documento nao encontrado' });

    const completo = path.resolve(env.pdfDir, doc.caminho);
    const dentroDaPasta = completo.startsWith(env.pdfDir + path.sep);
    if (!dentroDaPasta || !fs.existsSync(completo)) {
      return reply.code(404).send({ erro: 'arquivo indisponivel' });
    }

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `inline; filename="${encodeURIComponent(doc.arquivo)}"`);
    reply.header('Cache-Control', 'private, max-age=3600');
    return reply.send(fs.createReadStream(completo, { flags: 'r' }));
  });

  app.get('/documentos/:id/paginas', async (req) => {
    const { id } = paramsId.parse(req.params);
    return db
      .select()
      .from(paginas)
      .where(eq(paginas.documentoId, id))
      .orderBy(asc(paginas.numero))
      .all();
  });

  app.get('/documentos/:id/links', async (req) => {
    const { id } = paramsId.parse(req.params);
    return db
      .select()
      .from(links)
      .where(eq(links.documentoId, id))
      .orderBy(asc(links.pagina))
      .all();
  });

  /** PATCH /documentos/:id/leitura — grava a ultima pagina lida. */
  app.patch('/documentos/:id/leitura', async (req, reply) => {
    const { id } = paramsId.parse(req.params);
    const { pagina } = z.object({ pagina: z.number().int().positive() }).parse(req.body);

    const atualizado = db
      .update(documentos)
      .set({ ultimaPagina: pagina, ultimaLeituraEm: new Date().toISOString() })
      .where(eq(documentos.id, id))
      .returning({ id: documentos.id, ultimaPagina: documentos.ultimaPagina })
      .get();

    if (!atualizado) return reply.code(404).send({ erro: 'documento nao encontrado' });
    return atualizado;
  });
};

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sqlite } from '../db/cliente.ts';
import { termoFts } from '../db/fts.ts';

type LinhaBusca = {
  documentoId: number;
  documentoTitulo: string;
  materiaId: number;
  materiaNome: string;
  pagina: number;
  trecho: string;
  pontuacao: number;
};

export const rotasBusca: FastifyPluginAsync = async (app) => {
  /** GET /busca?q=texto — busca full-text no conteudo dos PDFs (FTS5). */
  app.get('/busca', async (req) => {
    const { q, limite } = z
      .object({
        q: z.string().min(2),
        limite: z.coerce.number().int().min(1).max(100).default(30),
      })
      .parse(req.query);

    const termo = termoFts(q);
    if (!termo) return { termo: q, total: 0, resultados: [] };

    const resultados = sqlite
      .prepare(
        `SELECT
           d.id    AS documentoId,
           d.titulo AS documentoTitulo,
           m.id    AS materiaId,
           m.nome  AS materiaNome,
           p.numero AS pagina,
           snippet(paginas_fts, 0, '<mark>', '</mark>', '...', 24) AS trecho,
           bm25(paginas_fts) AS pontuacao
         FROM paginas_fts
         JOIN paginas p ON p.id = paginas_fts.rowid
         JOIN documentos d ON d.id = p.documento_id
         JOIN materias m ON m.id = d.materia_id
         WHERE paginas_fts MATCH ?
         ORDER BY pontuacao
         LIMIT ?`,
      )
      .all(termo, limite) as LinhaBusca[];

    return { termo: q, total: resultados.length, resultados };
  });
};

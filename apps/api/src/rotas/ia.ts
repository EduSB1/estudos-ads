import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { pedidoIaSchema } from '@estudos/shared';
import { db } from '../db/cliente.ts';
import { documentos, materias, questoes } from '../db/schema.ts';
import { provedorIa } from '../ia/gemini.ts';
import { IaIndisponivelError } from '../ia/provider.ts';
import { impressaoDigital } from '../pdf/questoes.ts';

/** Rotas que usam IA. Sem GEMINI_API_KEY elas respondem 503 e a UI desabilita os botoes. */
export const rotasIa: FastifyPluginAsync = async (app) => {
  app.get('/ia/status', async () => ({
    disponivel: provedorIa.disponivel(),
    provedor: provedorIa.nome,
    modelo: provedorIa.modelo,
  }));

  function contexto(dados: { documentoId?: number | null; materiaId?: number | null }) {
    const doc = dados.documentoId
      ? db
          .select({ titulo: documentos.titulo, materiaId: documentos.materiaId })
          .from(documentos)
          .where(eq(documentos.id, dados.documentoId))
          .get()
      : null;

    const materiaId = dados.materiaId ?? doc?.materiaId ?? null;
    const materia = materiaId
      ? db.select({ nome: materias.nome }).from(materias).where(eq(materias.id, materiaId)).get()
      : null;

    return { documento: doc?.titulo ?? null, materia: materia?.nome ?? null, materiaId };
  }

  /** POST /ia/extrair-questoes — ligado ao botao "extrair com IA". */
  app.post('/ia/extrair-questoes', async (req, reply) => {
    const dados = pedidoIaSchema.parse(req.body);
    const ctx = contexto(dados);

    try {
      const resultado = await provedorIa.extrairQuestoes({
        trecho: dados.trecho,
        materia: ctx.materia,
        documento: ctx.documento,
        pagina: dados.pagina ?? null,
      });

      let salvas = 0;
      for (const q of resultado.questoes) {
        const inserida = db
          .insert(questoes)
          .values({
            documentoId: dados.documentoId ?? null,
            materiaId: ctx.materiaId,
            pagina: dados.pagina ?? null,
            numero: q.numero,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            gabarito: q.gabarito,
            explicacao: q.explicacao,
            origem: 'ia',
            impressaoDigital: impressaoDigital(dados.documentoId ?? null, q.enunciado),
          })
          .onConflictDoNothing({ target: questoes.impressaoDigital })
          .run();
        if (inserida.changes > 0) salvas++;
      }

      return { extraidas: resultado.questoes.length, salvas, questoes: resultado.questoes };
    } catch (erro) {
      if (erro instanceof IaIndisponivelError) {
        return reply.code(503).send({ erro: erro.message });
      }
      return reply.code(502).send({ erro: (erro as Error).message });
    }
  });

  /** POST /ia/gerar-codigo — ligado ao botao "gerar codigo de exemplo". */
  app.post('/ia/gerar-codigo', async (req, reply) => {
    const dados = pedidoIaSchema.parse(req.body);
    const ctx = contexto(dados);

    try {
      return await provedorIa.gerarExemplosCodigo({
        trecho: dados.trecho,
        materia: ctx.materia,
        documento: ctx.documento,
        pagina: dados.pagina ?? null,
        linguagem: dados.linguagem,
      });
    } catch (erro) {
      if (erro instanceof IaIndisponivelError) {
        return reply.code(503).send({ erro: erro.message });
      }
      return reply.code(502).send({ erro: (erro as Error).message });
    }
  });
};

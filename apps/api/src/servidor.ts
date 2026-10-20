import cors from '@fastify/cors';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { ZodError, z } from 'zod';
import { rotasAnotacoes } from './rotas/anotacoes.ts';
import { rotasBusca } from './rotas/busca.ts';
import { rotasDestaques } from './rotas/destaques.ts';
import { rotasDocumentos } from './rotas/documentos.ts';
import { rotasExecucao } from './rotas/execucao.ts';
import { rotasIa } from './rotas/ia.ts';
import { rotasMaterias } from './rotas/materias.ts';
import { rotasPreferencias } from './rotas/preferencias.ts';
import { rotasQuestoes } from './rotas/questoes.ts';
import { rotasSnippets } from './rotas/snippets.ts';

export async function criarServidor(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { transport: undefined, level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 2 * 1024 * 1024,
  });

  // Sem os metodos explicitos, o preflight recusa PATCH/DELETE e a UI falha ao salvar.
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.setErrorHandler((erro: unknown, _req, reply) => {
    if (erro instanceof ZodError) {
      return reply.code(400).send({ erro: 'dados invalidos', detalhes: z.treeifyError(erro) });
    }
    app.log.error(erro);
    const status = (erro as { statusCode?: number }).statusCode ?? 500;
    const mensagem = erro instanceof Error ? erro.message : 'erro interno';
    return reply.code(status).send({ erro: mensagem });
  });

  await app.register(rotasMaterias);
  await app.register(rotasDocumentos);
  await app.register(rotasAnotacoes);
  await app.register(rotasDestaques);
  await app.register(rotasQuestoes);
  await app.register(rotasSnippets);
  await app.register(rotasBusca);
  await app.register(rotasExecucao);
  await app.register(rotasIa);
  await app.register(rotasPreferencias);

  return app;
}

import type { FastifyPluginAsync } from 'fastify';
import { executarCodigoSchema, LIMITES_EXECUCAO, LINGUAGENS_PISTON } from '@estudos/shared';
import { env } from '../env.ts';

/**
 * Execucao das linguagens compiladas (Java, C, C#) via Piston self-hosted.
 * JS/TS, Python e SQL rodam no proprio navegador e nao passam por aqui.
 */

function truncar(texto: string): { texto: string; truncado: boolean } {
  const bytes = Buffer.byteLength(texto, 'utf8');
  const linhas = texto.split('\n');
  if (bytes <= LIMITES_EXECUCAO.maxSaidaBytes && linhas.length <= LIMITES_EXECUCAO.maxLinhasSaida) {
    return { texto, truncado: false };
  }
  const cortado = linhas
    .slice(0, LIMITES_EXECUCAO.maxLinhasSaida)
    .join('\n')
    .slice(0, LIMITES_EXECUCAO.maxSaidaBytes);
  return { texto: `${cortado}\n--- saida truncada ---`, truncado: true };
}

export const rotasExecucao: FastifyPluginAsync = async (app) => {
  app.post('/executar', async (req, reply) => {
    const dados = executarCodigoSchema.parse(req.body);
    const alvo = LINGUAGENS_PISTON[dados.linguagem];

    if (!alvo) {
      return reply.code(400).send({
        erro: `${dados.linguagem} roda no navegador; nao use esta rota.`,
      });
    }

    const inicio = performance.now();
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort(), LIMITES_EXECUCAO.timeoutMs + 2_000);

    try {
      const resposta = await fetch(`${env.PISTON_URL}/api/v2/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controle.signal,
        body: JSON.stringify({
          language: alvo.language,
          version: alvo.version,
          files: [{ name: nomeArquivo(dados.linguagem), content: dados.codigo }],
          stdin: dados.stdin,
          run_timeout: LIMITES_EXECUCAO.timeoutMs,
          compile_timeout: LIMITES_EXECUCAO.timeoutMs,
        }),
      });

      if (!resposta.ok) {
        return reply.code(502).send({ erro: `Piston respondeu ${resposta.status}` });
      }

      const corpo = (await resposta.json()) as {
        run?: { stdout?: string; stderr?: string; code?: number };
        compile?: { stdout?: string; stderr?: string };
      };

      const stdout = truncar(corpo.run?.stdout ?? '');
      const stderr = truncar((corpo.compile?.stderr ?? '') + (corpo.run?.stderr ?? ''));

      return {
        stdout: stdout.texto,
        stderr: stderr.texto,
        codigoSaida: corpo.run?.code ?? null,
        duracaoMs: Math.round(performance.now() - inicio),
        truncado: stdout.truncado || stderr.truncado,
        erro: null,
      };
    } catch (erro) {
      const abortou = (erro as Error).name === 'AbortError';
      return reply.code(abortou ? 504 : 502).send({
        stdout: '',
        stderr: '',
        codigoSaida: null,
        duracaoMs: Math.round(performance.now() - inicio),
        truncado: false,
        erro: abortou
          ? 'tempo limite excedido'
          : `Piston indisponivel em ${env.PISTON_URL}: ${(erro as Error).message}`,
      });
    } finally {
      clearTimeout(timer);
    }
  });
};

function nomeArquivo(linguagem: string): string {
  if (linguagem === 'java') return 'Main.java';
  if (linguagem === 'c') return 'main.c';
  if (linguagem === 'csharp') return 'Main.cs';
  return 'main.txt';
}

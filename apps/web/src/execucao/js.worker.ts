/// <reference lib="webworker" />
/**
 * Executa JS/TS isolado do documento. TypeScript e transpilado com esbuild-wasm.
 * O worker e descartado pelo chamador no timeout, entao um laco infinito nao trava a aba.
 */
import * as esbuild from 'esbuild-wasm';
import wasmUrl from 'esbuild-wasm/esbuild.wasm?url';

let pronto: Promise<void> | null = null;

async function iniciarEsbuild(): Promise<void> {
  pronto ??= esbuild.initialize({ wasmURL: wasmUrl });
  return pronto;
}

type Mensagem = { codigo: string; linguagem: 'javascript' | 'typescript' };

self.onmessage = async (evento: MessageEvent<Mensagem>) => {
  const { codigo, linguagem } = evento.data;
  const saida: string[] = [];
  const erros: string[] = [];

  const serializar = (valor: unknown): string => {
    if (typeof valor === 'string') return valor;
    try {
      return JSON.stringify(valor, null, 2) ?? String(valor);
    } catch {
      return String(valor);
    }
  };

  const console = {
    log: (...args: unknown[]) => saida.push(args.map(serializar).join(' ')),
    info: (...args: unknown[]) => saida.push(args.map(serializar).join(' ')),
    warn: (...args: unknown[]) => erros.push(args.map(serializar).join(' ')),
    error: (...args: unknown[]) => erros.push(args.map(serializar).join(' ')),
    debug: (...args: unknown[]) => saida.push(args.map(serializar).join(' ')),
    table: (valor: unknown) => saida.push(serializar(valor)),
  };

  const inicio = performance.now();

  try {
    let fonte = codigo;
    if (linguagem === 'typescript') {
      await iniciarEsbuild();
      const transformado = await esbuild.transform(codigo, {
        loader: 'ts',
        target: 'es2022',
        format: 'esm',
      });
      fonte = transformado.code;
    }

    const executar = new Function(
      'console',
      `"use strict"; return (async () => { ${fonte} \n })();`,
    ) as (c: typeof console) => Promise<unknown>;

    const retorno = await executar(console);
    if (retorno !== undefined) saida.push(serializar(retorno));
  } catch (erro) {
    erros.push(erro instanceof Error ? `${erro.name}: ${erro.message}` : String(erro));
  }

  self.postMessage({
    stdout: saida.join('\n'),
    stderr: erros.join('\n'),
    duracaoMs: Math.round(performance.now() - inicio),
  });
};

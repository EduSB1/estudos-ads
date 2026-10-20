import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { api } from '@/lib/api';
import { LIMITES, truncar, vazio, type Resultado } from './tipos';

/* -------------------------------------------------------------- JS e TS */

export function executarJs(
  codigo: string,
  linguagem: 'javascript' | 'typescript',
): Promise<Resultado> {
  return new Promise((resolver) => {
    const worker = new Worker(new URL('./js.worker.ts', import.meta.url), { type: 'module' });
    const inicio = performance.now();

    const limite = setTimeout(() => {
      worker.terminate();
      resolver({
        ...vazio(),
        duracaoMs: LIMITES.timeoutMs,
        erro: `Tempo limite de ${LIMITES.timeoutMs / 1000}s excedido. A execução foi interrompida.`,
      });
    }, LIMITES.timeoutMs);

    worker.onmessage = (evento: MessageEvent<Omit<Resultado, 'truncado' | 'erro'>>) => {
      clearTimeout(limite);
      worker.terminate();
      const stdout = truncar(evento.data.stdout);
      const stderr = truncar(evento.data.stderr);
      resolver({
        stdout: stdout.texto,
        stderr: stderr.texto,
        duracaoMs: evento.data.duracaoMs,
        truncado: stdout.truncado || stderr.truncado,
        erro: null,
      });
    };

    worker.onerror = (evento) => {
      clearTimeout(limite);
      worker.terminate();
      resolver({
        ...vazio(),
        duracaoMs: Math.round(performance.now() - inicio),
        erro: evento.message || 'falha no worker',
      });
    };

    worker.postMessage({ codigo, linguagem });
  });
}

/* ------------------------------------------------------------- Python */

type Pyodide = {
  runPythonAsync: (codigo: string) => Promise<unknown>;
  setStdout: (opcoes: { batched: (texto: string) => void }) => void;
  setStderr: (opcoes: { batched: (texto: string) => void }) => void;
};

let pyodide: Pyodide | null = null;
let carregandoPyodide: Promise<Pyodide> | null = null;

/** Pyodide pesa ~10 MB: carrega uma vez e fica em memoria. */
export async function carregarPyodide(aoProgredir?: (m: string) => void): Promise<Pyodide> {
  if (pyodide) return pyodide;
  carregandoPyodide ??= (async () => {
    aoProgredir?.('Baixando Pyodide (primeira execução, pode demorar)…');
    const { loadPyodide } = await import('pyodide');
    const instancia = (await loadPyodide()) as unknown as Pyodide;
    pyodide = instancia;
    aoProgredir?.('Pyodide pronto.');
    return instancia;
  })();
  return carregandoPyodide;
}

export async function executarPython(
  codigo: string,
  aoProgredir?: (m: string) => void,
): Promise<Resultado> {
  const inicio = performance.now();
  const saida: string[] = [];
  const erros: string[] = [];

  try {
    const py = await carregarPyodide(aoProgredir);
    py.setStdout({ batched: (t) => saida.push(t) });
    py.setStderr({ batched: (t) => erros.push(t) });

    const corrida = py.runPythonAsync(codigo);
    const limite = new Promise<never>((_, rejeitar) =>
      setTimeout(() => rejeitar(new Error('tempo limite excedido')), LIMITES.timeoutMs),
    );

    const retorno = await Promise.race([corrida, limite]);
    if (retorno !== undefined && retorno !== null) saida.push(String(retorno));

    const stdout = truncar(saida.join('\n'));
    const stderr = truncar(erros.join('\n'));
    return {
      stdout: stdout.texto,
      stderr: stderr.texto,
      duracaoMs: Math.round(performance.now() - inicio),
      truncado: stdout.truncado || stderr.truncado,
      erro: null,
    };
  } catch (erro) {
    return {
      stdout: saida.join('\n'),
      stderr: erros.join('\n'),
      duracaoMs: Math.round(performance.now() - inicio),
      truncado: false,
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

/* ----------------------------------------------------------------- SQL */

let bancoSql: unknown = null;

/** SQL roda em sql.js: um SQLite em WebAssembly, em memoria, so para praticar. */
export async function executarSql(codigo: string): Promise<Resultado> {
  const inicio = performance.now();
  try {
    const initSqlJs = (await import('sql.js')).default;
    // O .wasm vem resolvido pelo Vite; nada e buscado em CDN.
    const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });

    bancoSql ??= new SQL.Database();
    const banco = bancoSql as InstanceType<typeof SQL.Database>;
    const resultados = banco.exec(codigo);

    const linhas: string[] = [];
    for (const r of resultados) {
      linhas.push(r.columns.join(' | '));
      linhas.push(r.columns.map(() => '---').join(' | '));
      for (const valores of r.values) {
        linhas.push(valores.map((v) => (v === null ? 'NULL' : String(v))).join(' | '));
      }
      linhas.push('');
    }
    if (!resultados.length) linhas.push('Comando executado. Nenhuma linha retornada.');

    const stdout = truncar(linhas.join('\n'));
    return {
      stdout: stdout.texto,
      stderr: '',
      duracaoMs: Math.round(performance.now() - inicio),
      truncado: stdout.truncado,
      erro: null,
    };
  } catch (erro) {
    return {
      ...vazio(),
      duracaoMs: Math.round(performance.now() - inicio),
      erro: erro instanceof Error ? erro.message : String(erro),
    };
  }
}

/** Descarta o banco em memoria do sql.js. */
export function reiniciarSql(): void {
  bancoSql = null;
}

/* -------------------------------------------------------------- Piston */

export async function executarViaPiston(
  linguagem: string,
  codigo: string,
  stdin: string,
): Promise<Resultado> {
  try {
    return await api.post<Resultado>('/executar', { linguagem, codigo, stdin });
  } catch (erro) {
    return { ...vazio(), erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

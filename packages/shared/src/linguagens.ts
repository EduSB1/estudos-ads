/** Linguagens suportadas pela mini IDE e como cada uma e executada. */
export const LINGUAGENS = {
  javascript: { rotulo: 'JavaScript', runtime: 'worker', extensao: 'js', monaco: 'javascript' },
  typescript: { rotulo: 'TypeScript', runtime: 'worker', extensao: 'ts', monaco: 'typescript' },
  python: { rotulo: 'Python', runtime: 'pyodide', extensao: 'py', monaco: 'python' },
  sql: { rotulo: 'SQL', runtime: 'sqljs', extensao: 'sql', monaco: 'sql' },
  java: { rotulo: 'Java', runtime: 'piston', extensao: 'java', monaco: 'java' },
  c: { rotulo: 'C', runtime: 'piston', extensao: 'c', monaco: 'c' },
  csharp: { rotulo: 'C#', runtime: 'piston', extensao: 'cs', monaco: 'csharp' },
} as const;

export type Linguagem = keyof typeof LINGUAGENS;
export type Runtime = (typeof LINGUAGENS)[Linguagem]['runtime'];

export const LINGUAGENS_PISTON: Record<string, { language: string; version: string }> = {
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
  csharp: { language: 'csharp', version: '6.12.0' },
};

/** Limites da execucao de codigo, aplicados tanto no navegador quanto na API. */
export const LIMITES_EXECUCAO = {
  timeoutMs: 10_000,
  maxSaidaBytes: 64 * 1024,
  maxLinhasSaida: 2_000,
} as const;

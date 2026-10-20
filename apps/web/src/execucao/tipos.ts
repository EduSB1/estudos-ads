export type Resultado = {
  stdout: string;
  stderr: string;
  duracaoMs: number;
  truncado: boolean;
  erro: string | null;
};

export const LIMITES = {
  timeoutMs: 10_000,
  maxLinhas: 2_000,
  maxBytes: 64 * 1024,
} as const;

export function truncar(texto: string): { texto: string; truncado: boolean } {
  const linhas = texto.split('\n');
  if (linhas.length <= LIMITES.maxLinhas && texto.length <= LIMITES.maxBytes) {
    return { texto, truncado: false };
  }
  return {
    texto:
      linhas.slice(0, LIMITES.maxLinhas).join('\n').slice(0, LIMITES.maxBytes) +
      '\n--- saída truncada ---',
    truncado: true,
  };
}

export const vazio = (): Resultado => ({
  stdout: '',
  stderr: '',
  duracaoMs: 0,
  truncado: false,
  erro: null,
});

/** Cliente HTTP da API. Erros viram ErroApi, com a mensagem que a API devolveu. */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ErroApi';
  }
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (resposta.status === 204) return undefined as T;

  const corpo = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    throw new ErroApi(
      (corpo as { erro?: string } | null)?.erro ?? `Falha ${resposta.status}`,
      resposta.status,
    );
  }
  return corpo as T;
}

export const api = {
  get: <T>(caminho: string) => requisitar<T>(caminho),
  post: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
  patch: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),
  put: <T>(caminho: string, corpo: unknown) =>
    requisitar<T>(caminho, { method: 'PUT', body: JSON.stringify(corpo) }),
  delete: (caminho: string) => requisitar<void>(caminho, { method: 'DELETE' }),
  urlArquivo: (documentoId: number) => `${BASE}/documentos/${documentoId}/arquivo`,
};

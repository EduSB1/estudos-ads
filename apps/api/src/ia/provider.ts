import type { ExemplosCodigo, QuestoesExtraidas } from '@estudos/shared';

export type ContextoTrecho = {
  trecho: string;
  materia?: string | null;
  documento?: string | null;
  pagina?: number | null;
  linguagem?: string | undefined;
};

/**
 * Contrato de qualquer provedor de IA do projeto.
 * Trocar de provedor nao deve exigir mudanca nas rotas.
 */
export interface AIProvider {
  readonly nome: string;
  readonly modelo: string;
  disponivel(): boolean;
  extrairQuestoes(ctx: ContextoTrecho): Promise<QuestoesExtraidas>;
  gerarExemplosCodigo(ctx: ContextoTrecho): Promise<ExemplosCodigo>;
}

export class IaIndisponivelError extends Error {
  constructor() {
    super('IA nao configurada: defina GEMINI_API_KEY no .env');
    this.name = 'IaIndisponivelError';
  }
}

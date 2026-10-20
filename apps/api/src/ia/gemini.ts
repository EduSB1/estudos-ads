import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { exemplosCodigoSchema, questoesExtraidasSchema } from '@estudos/shared';
import type { ExemplosCodigo, QuestoesExtraidas } from '@estudos/shared';
import { env } from '../env.ts';
import { chaveCache, gravarCache, lerCache } from './cache.ts';
import { IaIndisponivelError, type AIProvider, type ContextoTrecho } from './provider.ts';

const MAX_TENTATIVAS = 4;
const ESPERA_BASE_MS = 1_000;

/** Converte o schema Zod no JSON Schema que o Gemini aceita em responseSchema. */
function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const bruto = z.toJSONSchema(schema, { target: 'draft-7', io: 'output' }) as Record<
    string,
    unknown
  >;
  return limpar(bruto) as Record<string, unknown>;
}

/** O Gemini rejeita algumas palavras-chave de JSON Schema; removemos o que nao e suportado. */
function limpar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(limpar);
  if (valor && typeof valor === 'object') {
    const saida: Record<string, unknown> = {};
    for (const [chave, v] of Object.entries(valor as Record<string, unknown>)) {
      if (
        ['$schema', 'additionalProperties', 'exclusiveMinimum', 'exclusiveMaximum'].includes(chave)
      )
        continue;
      saida[chave] = limpar(v);
    }
    return saida;
  }
  return valor;
}

function ehRateLimit(erro: unknown): boolean {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return /429|rate.?limit|RESOURCE_EXHAUSTED|quota|503|UNAVAILABLE|overloaded/i.test(msg);
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiProvider implements AIProvider {
  readonly nome = 'gemini';
  readonly modelo = env.GEMINI_MODEL;
  private cliente: GoogleGenAI | null = null;

  disponivel(): boolean {
    return env.GEMINI_API_KEY.length > 0;
  }

  private obterCliente(): GoogleGenAI {
    if (!this.disponivel()) throw new IaIndisponivelError();
    this.cliente ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    return this.cliente;
  }

  /** Chamada com saida estruturada, retry exponencial em rate limit e cache em SQLite. */
  private async gerar<T>(
    tarefa: string,
    instrucao: string,
    ctx: ContextoTrecho,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const entrada = { instrucao, trecho: ctx.trecho, linguagem: ctx.linguagem ?? null };
    const chave = chaveCache(tarefa, this.modelo, entrada);

    const cacheado = lerCache<unknown>(chave);
    if (cacheado) {
      const validado = schema.safeParse(cacheado);
      if (validado.success) return validado.data;
    }

    const cliente = this.obterCliente();
    const prompt = [
      instrucao,
      ctx.materia ? `Materia: ${ctx.materia}` : null,
      ctx.documento ? `Documento: ${ctx.documento}` : null,
      ctx.pagina ? `Pagina: ${ctx.pagina}` : null,
      ctx.linguagem ? `Linguagem alvo: ${ctx.linguagem}` : null,
      '',
      'Trecho do material:',
      '"""',
      ctx.trecho,
      '"""',
    ]
      .filter(Boolean)
      .join('\n');

    let ultimoErro: unknown = null;

    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      try {
        const resposta = await cliente.models.generateContent({
          model: this.modelo,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema(schema),
            temperature: 0.2,
            systemInstruction:
              'Voce apoia um estudante de Analise e Desenvolvimento de Sistemas. ' +
              'Responda sempre em portugues do Brasil e apenas com o JSON pedido.',
          },
        });

        const texto = resposta.text;
        if (!texto) throw new Error('resposta vazia da IA');

        const validado = schema.safeParse(JSON.parse(texto));
        if (!validado.success) {
          throw new Error(`resposta fora do schema: ${z.prettifyError(validado.error)}`);
        }

        gravarCache(chave, tarefa, this.modelo, validado.data);
        return validado.data;
      } catch (erro) {
        ultimoErro = erro;
        const ultima = tentativa === MAX_TENTATIVAS;
        if (ultima || !ehRateLimit(erro)) break;
        await dormir(ESPERA_BASE_MS * 2 ** (tentativa - 1));
      }
    }

    throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
  }

  extrairQuestoes(ctx: ContextoTrecho): Promise<QuestoesExtraidas> {
    return this.gerar(
      'extrair-questoes',
      'Extraia as questoes de multipla escolha presentes no trecho. ' +
        'Nao invente questoes que nao estejam no texto. ' +
        'Se houver gabarito indicado, preencha o campo gabarito com a letra; senao use null.',
      ctx,
      questoesExtraidasSchema,
    );
  }

  gerarExemplosCodigo(ctx: ContextoTrecho): Promise<ExemplosCodigo> {
    return this.gerar(
      'gerar-exemplos',
      'Gere ate 3 exemplos de codigo curtos, executaveis e comentados que demonstrem ' +
        'os conceitos do trecho. Prefira a linguagem alvo quando informada.',
      ctx,
      exemplosCodigoSchema,
    );
  }
}

export const provedorIa: AIProvider = new GeminiProvider();

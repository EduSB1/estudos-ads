import { describe, expect, it } from 'vitest';
import {
  criarAnotacaoSchema,
  criarQuestaoSchema,
  criarRespostaSchema,
  questoesExtraidasSchema,
} from './schemas.ts';

describe('criarAnotacaoSchema', () => {
  it('exige materiaId ou documentoId', () => {
    expect(criarAnotacaoSchema.safeParse({ conteudoHtml: '<p>a</p>' }).success).toBe(false);
    expect(criarAnotacaoSchema.safeParse({ documentoId: 1 }).success).toBe(true);
    expect(criarAnotacaoSchema.safeParse({ materiaId: 2 }).success).toBe(true);
  });
});

describe('criarQuestaoSchema', () => {
  it('assume origem manual e lista de alternativas vazia', () => {
    const resultado = criarQuestaoSchema.parse({ enunciado: 'Uma pergunta valida' });
    expect(resultado.origem).toBe('manual');
    expect(resultado.alternativas).toEqual([]);
  });

  it('recusa enunciado curto demais', () => {
    expect(criarQuestaoSchema.safeParse({ enunciado: 'oi' }).success).toBe(false);
  });
});

describe('criarRespostaSchema', () => {
  it('aceita apenas as tres marcacoes previstas', () => {
    expect(criarRespostaSchema.safeParse({ questaoId: 1, marcacao: 'certa' }).success).toBe(true);
    expect(criarRespostaSchema.safeParse({ questaoId: 1, marcacao: 'talvez' }).success).toBe(false);
  });
});

describe('questoesExtraidasSchema', () => {
  it('valida a saida estruturada que a IA deve devolver', () => {
    const payload = {
      questoes: [
        {
          numero: '1',
          enunciado: 'Pergunta',
          alternativas: [{ letra: 'a', texto: 'Resposta' }],
          gabarito: 'a',
          explicacao: null,
        },
      ],
    };
    expect(questoesExtraidasSchema.safeParse(payload).success).toBe(true);
  });
});

describe('schemas de atualizacao', () => {
  it('nao reinjeta defaults num PATCH parcial', async () => {
    const { atualizarDestaqueSchema, atualizarQuestaoSchema, atualizarSnippetSchema } =
      await import('./schemas.ts');

    // O bug: com `.partial()` sobre um schema que tem `.default()`, a cor voltava
    // como 'amarelo' e sobrescrevia o valor ja gravado.
    expect(atualizarDestaqueSchema.parse({ lembreteConcluido: true })).toEqual({
      lembreteConcluido: true,
    });
    expect(atualizarQuestaoSchema.parse({ revisada: true })).toEqual({ revisada: true });
    expect(atualizarSnippetSchema.parse({ codigo: 'x' })).toEqual({ codigo: 'x' });
  });
});

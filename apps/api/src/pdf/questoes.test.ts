import { describe, expect, it } from 'vitest';
import { extrairQuestoes } from './heuristica-questoes.ts';
import type { PaginaExtraida } from './extrair.ts';

function pagina(texto: string, numero = 1): PaginaExtraida {
  return { numero, texto, totalCaracteres: texto.length, largura: 595, altura: 842 };
}

describe('extrairQuestoes', () => {
  it('extrai uma questao numerada com alternativas a)-e)', () => {
    const texto = [
      '1. Qual principio do Scrum trata de entregas incrementais?',
      'a) Transparencia',
      'b) Inspecao',
      'c) Adaptacao',
      'd) Incrementalidade',
      'e) Nenhuma das anteriores',
    ].join('\n');

    const [questao] = extrairQuestoes([pagina(texto)]);

    expect(questao).toBeDefined();
    expect(questao?.numero).toBe('1');
    expect(questao?.enunciado).toContain('entregas incrementais');
    expect(questao?.alternativas).toHaveLength(5);
    expect(questao?.alternativas[4]?.letra).toBe('e');
  });

  it('aceita o formato "Questao N:" e alternativas entre parenteses', () => {
    const texto = [
      'Questao 7: O que caracteriza um teste de caixa branca no desenvolvimento?',
      '(a) Conhecimento da estrutura interna',
      '(b) Foco apenas na interface',
      '(c) Execucao manual obrigatoria',
    ].join('\n');

    const [questao] = extrairQuestoes([pagina(texto, 4)]);

    expect(questao?.numero).toBe('7');
    expect(questao?.pagina).toBe(4);
    expect(questao?.alternativas).toHaveLength(3);
  });

  it('junta o enunciado quebrado em varias linhas', () => {
    const texto = [
      '2) Considere um processo de desenvolvimento incremental',
      'em que cada ciclo entrega uma parte funcional do sistema.',
      'Qual metodologia melhor descreve esse cenario?',
      'a) Cascata',
      'b) Scrum',
    ].join('\n');

    const [questao] = extrairQuestoes([pagina(texto)]);

    expect(questao?.enunciado).toContain('cada ciclo entrega');
    expect(questao?.enunciado).toContain('Qual metodologia');
  });

  it('ignora blocos sem alternativas suficientes', () => {
    const texto = ['3. Um enunciado solto sem nenhuma alternativa listada abaixo dele.'].join('\n');
    expect(extrairQuestoes([pagina(texto)])).toHaveLength(0);
  });

  it('ignora letras fora de ordem, que costumam ser texto corrido', () => {
    const texto = [
      '4. Um enunciado valido e suficientemente longo para passar no filtro.',
      'c) fora de ordem',
      'a) primeira',
    ].join('\n');

    const questoes = extrairQuestoes([pagina(texto)]);
    expect(questoes).toHaveLength(0);
  });

  it('separa duas questoes seguidas na mesma pagina', () => {
    const texto = [
      '1. Primeira pergunta com tamanho suficiente para validar?',
      'a) um',
      'b) dois',
      '2. Segunda pergunta com tamanho suficiente para validar?',
      'a) tres',
      'b) quatro',
    ].join('\n');

    const questoes = extrairQuestoes([pagina(texto)]);
    expect(questoes).toHaveLength(2);
    expect(questoes[1]?.numero).toBe('2');
  });
});

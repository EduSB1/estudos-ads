import { createHash } from 'node:crypto';
import type { PaginaExtraida } from './extrair.ts';

/**
 * Extracao de questoes por heuristica pura (sem IA e sem banco).
 *
 * Reconhece:
 *   - numeracao: "1.", "1)", "01 -", "Questao 3", "QUESTAO 03:"
 *   - alternativas: "a)", "(b)", "c -", "D)" ate a letra E
 *
 * O botao "extrair com IA" usa o GeminiProvider e grava com origem='ia'.
 */

export type QuestaoHeuristica = {
  numero: string | null;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  pagina: number;
};

const RE_NUMERO = /^\s*(?:quest[aã]o\s*)?(\d{1,3})\s*[.)\-:]\s*(.*)$/i;
const RE_ALTERNATIVA = /^\s*[([]?\s*([a-eA-E])\s*[).\-:]\s+(.*)$/;
const MIN_ALTERNATIVAS = 2;
const MIN_ENUNCIADO = 15;

export function extrairQuestoes(paginas: PaginaExtraida[]): QuestaoHeuristica[] {
  const encontradas: QuestaoHeuristica[] = [];

  for (const pagina of paginas) {
    const linhas = pagina.texto.split('\n');
    let atual: QuestaoHeuristica | null = null;
    let coletandoEnunciado = false;

    const fechar = () => {
      if (atual && atual.alternativas.length >= MIN_ALTERNATIVAS) {
        atual.enunciado = atual.enunciado.replace(/\s+/g, ' ').trim();
        if (atual.enunciado.length >= MIN_ENUNCIADO) encontradas.push(atual);
      }
      atual = null;
      coletandoEnunciado = false;
    };

    for (const linhaBruta of linhas) {
      const linha = linhaBruta.trim();
      if (!linha) continue;

      const alternativa = linha.match(RE_ALTERNATIVA);
      if (alternativa && atual) {
        const letra = alternativa[1]!.toLowerCase();
        const esperada = String.fromCharCode(97 + atual.alternativas.length);
        // Aceita so a sequencia a, b, c, ... para nao confundir com texto corrido.
        if (letra === esperada) {
          atual.alternativas.push({ letra, texto: alternativa[2]!.trim() });
          coletandoEnunciado = false;
          continue;
        }
      }

      const numero = linha.match(RE_NUMERO);
      if (numero && !(alternativa && atual)) {
        fechar();
        atual = {
          numero: numero[1]!,
          enunciado: numero[2]!.trim(),
          alternativas: [],
          pagina: pagina.numero,
        };
        coletandoEnunciado = true;
        continue;
      }

      if (atual && coletandoEnunciado) {
        atual.enunciado += ' ' + linha;
      } else if (atual && atual.alternativas.length) {
        // Continuacao da ultima alternativa (texto quebrado em varias linhas).
        const ultima = atual.alternativas[atual.alternativas.length - 1]!;
        ultima.texto += ' ' + linha;
      }
    }
    fechar();
  }

  return encontradas;
}

/** Identidade estavel da questao, para nao duplicar a cada reindexacao. */
export function impressaoDigital(documentoId: number | null, enunciado: string): string {
  const normal = enunciado
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return createHash('sha256')
    .update(`${documentoId ?? 0}:${normal}`)
    .digest('hex')
    .slice(0, 32);
}

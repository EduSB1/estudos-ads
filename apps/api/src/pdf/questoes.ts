import { db } from '../db/cliente.ts';
import { questoes } from '../db/schema.ts';
import { impressaoDigital, type QuestaoHeuristica } from './heuristica-questoes.ts';

export { extrairQuestoes, impressaoDigital } from './heuristica-questoes.ts';
export type { QuestaoHeuristica } from './heuristica-questoes.ts';

/** Grava as questoes encontradas, ignorando as que ja existem (mesma impressao digital). */
export function salvarQuestoes(
  documentoId: number,
  materiaId: number,
  encontradas: QuestaoHeuristica[],
): number {
  let salvas = 0;
  for (const q of encontradas) {
    const resultado = db
      .insert(questoes)
      .values({
        documentoId,
        materiaId,
        pagina: q.pagina,
        numero: q.numero,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        origem: 'heuristica',
        impressaoDigital: impressaoDigital(documentoId, q.enunciado),
      })
      .onConflictDoNothing({ target: questoes.impressaoDigital })
      .run();
    if (resultado.changes > 0) salvas++;
  }
  return salvas;
}

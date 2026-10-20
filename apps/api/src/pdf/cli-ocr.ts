import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db/cliente.ts';
import { documentos, paginas } from '../db/schema.ts';
import { migrarBanco } from '../db/migrar.ts';
import { env } from '../env.ts';
import path from 'node:path';
import { encerrarOcr, ocrPdf } from './ocr.ts';
import { extrairQuestoes } from './heuristica-questoes.ts';
import { salvarQuestoes } from './questoes.ts';

/**
 * Roda OCR nos documentos marcados com precisa_ocr e grava o texto no FTS5.
 *
 * Uso:
 *   pnpm --filter api ocr                 # todos os pendentes
 *   pnpm --filter api ocr -- --id 11      # so um documento
 *   pnpm --filter api ocr -- --limite 3   # os tres primeiros
 */

migrarBanco();

const argv = process.argv.slice(2);
const valor = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1]! : null;
};

const soId = valor('--id');
const limite = Number(valor('--limite') ?? 0);

const pendentes = db
  .select({
    id: documentos.id,
    materiaId: documentos.materiaId,
    titulo: documentos.titulo,
    caminho: documentos.caminho,
  })
  .from(documentos)
  .where(soId ? eq(documentos.id, Number(soId)) : eq(documentos.precisaOcr, true))
  .all();

const alvos = limite > 0 ? pendentes.slice(0, limite) : pendentes;

if (!alvos.length) {
  console.log('Nenhum documento pendente de OCR.');
  sqlite.close();
  process.exit(0);
}

console.log(`OCR em ${alvos.length} documento(s). Isso leva alguns minutos por arquivo.\n`);

let total = 0;
for (const [i, doc] of alvos.entries()) {
  const completo = path.resolve(env.pdfDir, doc.caminho);
  process.stdout.write(`[${i + 1}/${alvos.length}] ${doc.titulo}\n`);

  try {
    const extraidas = await ocrPdf(completo, ({ pagina, total: n, caracteres }) => {
      process.stdout.write(`\r    página ${pagina}/${n} — ${caracteres} caracteres     `);
    });

    const comTexto = extraidas.filter((p) => p.totalCaracteres > 0).length;

    db.transaction((tx) => {
      // Os gatilhos do FTS5 acompanham o delete/insert das paginas.
      tx.delete(paginas).where(eq(paginas.documentoId, doc.id)).run();
      for (const p of extraidas) tx.insert(paginas).values({ documentoId: doc.id, ...p }).run();
      tx.update(documentos)
        .set({
          precisaOcr: false,
          status: 'indexado',
          indexadoEm: new Date().toISOString(),
        })
        .where(eq(documentos.id, doc.id))
        .run();
    });

    const questoes = salvarQuestoes(doc.id, doc.materiaId, extrairQuestoes(extraidas));
    total++;
    process.stdout.write(
      `\r    ${comTexto}/${extraidas.length} páginas com texto, ${questoes} questões              \n`,
    );
  } catch (erro) {
    process.stdout.write(`\r    ERRO: ${(erro as Error).message}                    \n`);
    db.update(documentos).set({ status: 'erro' }).where(eq(documentos.id, doc.id)).run();
  }
}

await encerrarOcr();
console.log(`\n${total}/${alvos.length} documentos com OCR concluído.`);
sqlite.close();

import { migrarBanco } from '../db/migrar.ts';
import { sqlite } from '../db/cliente.ts';
import { env } from '../env.ts';
import { varrerTudo } from './indexador.ts';
import { gravarRelatorio } from './relatorio-links.ts';

migrarBanco();
console.log(`Indexando PDFs de ${env.pdfDir} (somente leitura)\n`);

const resultados = await varrerTudo((r, i, total) => {
  const marca = r.acao === 'erro' ? 'ERRO ' : r.acao === 'inalterado' ? '=    ' : '+    ';
  const extra =
    r.acao === 'indexado'
      ? `${r.totalPaginas}p, ${r.totalLinks} links, ${r.totalQuestoes} questoes${r.precisaOcr ? ', PRECISA OCR' : ''}`
      : (r.erro ?? '');
  console.log(`[${i}/${total}] ${marca} ${r.arquivo} ${extra}`);
});

const indexados = resultados.filter((r) => r.acao === 'indexado').length;
const ocr = resultados.filter((r) => r.precisaOcr).length;
const erros = resultados.filter((r) => r.acao === 'erro');

console.log(`\n${indexados} indexados, ${ocr} marcados para OCR, ${erros.length} com erro.`);
for (const e of erros) console.error(`  ERRO ${e.arquivo}: ${e.erro}`);

const { md, relatorio } = gravarRelatorio();
console.log(`Relatorio de links: ${md} (${relatorio.totalLinks} links, nenhum acessado)`);
sqlite.close();

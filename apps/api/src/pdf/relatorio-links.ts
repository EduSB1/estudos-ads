import fs from 'node:fs';
import path from 'node:path';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/cliente.ts';
import { documentos, links, materias } from '../db/schema.ts';
import { env } from '../env.ts';

/**
 * Gera scripts/links-report/ com todos os links encontrados, agrupados por documento.
 *
 * IMPORTANTE: os links sao apenas LISTADOS. Nada e acessado pela rede.
 */

export type RelatorioLinks = {
  geradoEm: string;
  totalDocumentos: number;
  totalLinks: number;
  documentos: {
    documentoId: number;
    materia: string;
    titulo: string;
    caminho: string;
    precisaOcr: boolean;
    links: { pagina: number; url: string; tipo: string; texto: string | null }[];
  }[];
  escaneados: { documentoId: number; materia: string; titulo: string; caminho: string }[];
};

export function montarRelatorio(): RelatorioLinks {
  const docs = db
    .select({
      id: documentos.id,
      titulo: documentos.titulo,
      caminho: documentos.caminho,
      precisaOcr: documentos.precisaOcr,
      materia: materias.nome,
    })
    .from(documentos)
    .innerJoin(materias, eq(documentos.materiaId, materias.id))
    .orderBy(asc(materias.nome), asc(documentos.titulo))
    .all();

  const porDocumento: RelatorioLinks['documentos'] = [];
  let totalLinks = 0;

  for (const doc of docs) {
    const lista = db
      .select({
        pagina: links.pagina,
        url: links.url,
        tipo: links.tipo,
        texto: links.texto,
      })
      .from(links)
      .where(eq(links.documentoId, doc.id))
      .orderBy(asc(links.pagina))
      .all();

    if (!lista.length) continue;
    totalLinks += lista.length;
    porDocumento.push({
      documentoId: doc.id,
      materia: doc.materia,
      titulo: doc.titulo,
      caminho: doc.caminho,
      precisaOcr: doc.precisaOcr,
      links: lista,
    });
  }

  return {
    geradoEm: new Date().toISOString(),
    totalDocumentos: porDocumento.length,
    totalLinks,
    documentos: porDocumento,
    escaneados: docs
      .filter((d) => d.precisaOcr)
      .map((d) => ({
        documentoId: d.id,
        materia: d.materia,
        titulo: d.titulo,
        caminho: d.caminho,
      })),
  };
}

function markdown(relatorio: RelatorioLinks): string {
  const linhas: string[] = [
    '# Relatorio de links dos PDFs',
    '',
    `Gerado em: ${relatorio.geradoEm}`,
    '',
    `- Documentos com links: **${relatorio.totalDocumentos}**`,
    `- Links encontrados: **${relatorio.totalLinks}**`,
    `- PDFs marcados para OCR (sem texto): **${relatorio.escaneados.length}**`,
    '',
    '> Os links foram apenas listados. Nenhum deles foi acessado.',
    '',
  ];

  let materiaAtual = '';
  for (const doc of relatorio.documentos) {
    if (doc.materia !== materiaAtual) {
      materiaAtual = doc.materia;
      linhas.push(`## ${materiaAtual}`, '');
    }
    linhas.push(`### ${doc.titulo}`, '', `\`${doc.caminho}\``, '');
    linhas.push('| Pagina | Tipo | Link |', '| ---: | --- | --- |');
    for (const l of doc.links) {
      linhas.push(`| ${l.pagina} | ${l.tipo} | ${l.url.replace(/\|/g, '\\|')} |`);
    }
    linhas.push('');
  }

  if (relatorio.escaneados.length) {
    linhas.push('## PDFs marcados para OCR', '');
    for (const d of relatorio.escaneados)
      linhas.push(`- ${d.materia} — ${d.titulo} (\`${d.caminho}\`)`);
    linhas.push('');
  }

  return linhas.join('\n');
}

/** Escreve o relatorio em scripts/links-report/ (fora da pasta de PDFs). */
export function gravarRelatorio(): { json: string; md: string; relatorio: RelatorioLinks } {
  const relatorio = montarRelatorio();
  const destino = path.join(env.raizProjeto, 'scripts', 'links-report');
  fs.mkdirSync(destino, { recursive: true });

  const json = path.join(destino, 'links.json');
  const md = path.join(destino, 'links.md');
  fs.writeFileSync(json, JSON.stringify(relatorio, null, 2));
  fs.writeFileSync(md, markdown(relatorio));

  return { json, md, relatorio };
}

import fs from 'node:fs';
import path from 'node:path';
import chokidar from 'chokidar';
import { eq } from 'drizzle-orm';
import { db } from '../db/cliente.ts';
import { documentos, links as tabelaLinks, materias, paginas } from '../db/schema.ts';
import { env } from '../env.ts';
import { materiaDoCaminho, tituloDoArquivo, type DadosMateria } from './caminhos.ts';
import { extrairPdf, hashArquivo } from './extrair.ts';
import { extrairQuestoes, salvarQuestoes } from './questoes.ts';

/**
 * Varre PDF_DIR, cria uma Materia por pasta e um Documento por arquivo.
 * O hash do arquivo evita reindexar o que nao mudou.
 *
 * PDF_DIR e SOMENTE LEITURA: este modulo apenas le.
 */

function garantirMateria(dados: DadosMateria): number {
  const existente = db
    .select({ id: materias.id })
    .from(materias)
    .where(eq(materias.caminho, dados.caminho))
    .get();
  if (existente) return existente.id;

  const inserido = db
    .insert(materias)
    .values({
      slug: dados.slug,
      nome: dados.nome,
      semestre: dados.semestre,
      codigo: dados.codigo,
      caminho: dados.caminho,
    })
    .onConflictDoUpdate({ target: materias.caminho, set: { nome: dados.nome } })
    .returning({ id: materias.id })
    .get();
  return inserido.id;
}

export type ResultadoIndexacao = {
  arquivo: string;
  acao: 'indexado' | 'inalterado' | 'erro';
  precisaOcr?: boolean;
  totalPaginas?: number;
  totalLinks?: number;
  totalQuestoes?: number;
  erro?: string;
};

export async function indexarArquivo(caminhoAbsoluto: string): Promise<ResultadoIndexacao> {
  const rel = path.relative(env.pdfDir, caminhoAbsoluto);
  const dadosMateria = materiaDoCaminho(rel);
  if (!dadosMateria) {
    return { arquivo: rel, acao: 'erro', erro: 'arquivo fora de uma pasta de materia' };
  }

  try {
    const stat = fs.statSync(caminhoAbsoluto);
    const hash = hashArquivo(caminhoAbsoluto);

    const existente = db
      .select({ id: documentos.id, hash: documentos.hash })
      .from(documentos)
      .where(eq(documentos.caminho, rel))
      .get();

    if (existente?.hash === hash) return { arquivo: rel, acao: 'inalterado' };

    const materiaId = garantirMateria(dadosMateria);
    const extraido = await extrairPdf(caminhoAbsoluto);
    const titulo = tituloDoArquivo(rel);

    const documentoId = db.transaction((tx) => {
      const valores = {
        materiaId,
        titulo,
        arquivo: path.basename(rel),
        caminho: rel,
        hash,
        tamanhoBytes: stat.size,
        totalPaginas: extraido.totalPaginas,
        categoria: dadosMateria.categoria,
        status: extraido.precisaOcr ? ('precisa_ocr' as const) : ('indexado' as const),
        precisaOcr: extraido.precisaOcr,
        indexadoEm: new Date().toISOString(),
      };

      const id = existente
        ? (tx
            .update(documentos)
            .set(valores)
            .where(eq(documentos.id, existente.id))
            .returning({ id: documentos.id })
            .get()?.id ?? existente.id)
        : tx.insert(documentos).values(valores).returning({ id: documentos.id }).get().id;

      // Reindexacao limpa: os gatilhos do FTS5 acompanham o delete/insert de paginas.
      tx.delete(paginas).where(eq(paginas.documentoId, id)).run();
      tx.delete(tabelaLinks).where(eq(tabelaLinks.documentoId, id)).run();

      for (const p of extraido.paginas) {
        tx.insert(paginas)
          .values({ documentoId: id, ...p })
          .run();
      }
      for (const l of extraido.links) {
        tx.insert(tabelaLinks)
          .values({
            documentoId: id,
            pagina: l.pagina,
            url: l.url,
            texto: l.texto,
            tipo: l.tipo,
            retangulo: l.retangulo,
          })
          .run();
      }
      return id;
    });

    const questoes = extrairQuestoes(extraido.paginas);
    const salvas = salvarQuestoes(documentoId, materiaId, questoes);

    return {
      arquivo: rel,
      acao: 'indexado',
      precisaOcr: extraido.precisaOcr,
      totalPaginas: extraido.totalPaginas,
      totalLinks: extraido.links.length,
      totalQuestoes: salvas,
    };
  } catch (erro) {
    return { arquivo: rel, acao: 'erro', erro: (erro as Error).message };
  }
}

function listarPdfs(dir: string): string[] {
  const saida: string[] = [];
  if (!fs.existsSync(dir)) return saida;
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name.startsWith('.')) continue;
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) saida.push(...listarPdfs(completo));
    else if (entrada.isFile() && entrada.name.toLowerCase().endsWith('.pdf')) saida.push(completo);
  }
  return saida;
}

/** Varredura completa, usada no boot da API e pelo comando `pnpm indexar`. */
export async function varrerTudo(
  aoProgredir?: (r: ResultadoIndexacao, i: number, total: number) => void,
): Promise<ResultadoIndexacao[]> {
  const arquivos = listarPdfs(env.pdfDir).sort();
  const resultados: ResultadoIndexacao[] = [];
  for (const [i, arquivo] of arquivos.entries()) {
    const r = await indexarArquivo(arquivo);
    resultados.push(r);
    aoProgredir?.(r, i + 1, arquivos.length);
  }
  return resultados;
}

/** Observa PDF_DIR e reindexa o que mudar. Nunca escreve na pasta. */
export function observarPdfs(aoIndexar?: (r: ResultadoIndexacao) => void) {
  const observador = chokidar.watch(env.pdfDir, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1500, pollInterval: 200 },
    ignored: (caminho, stats) =>
      stats?.isFile() === true && !caminho.toLowerCase().endsWith('.pdf'),
  });

  const reindexar = async (caminho: string) => {
    const r = await indexarArquivo(caminho);
    aoIndexar?.(r);
  };

  observador.on('add', reindexar);
  observador.on('change', reindexar);
  observador.on('unlink', (caminho) => {
    const rel = path.relative(env.pdfDir, caminho);
    db.delete(documentos).where(eq(documentos.caminho, rel)).run();
    aoIndexar?.({ arquivo: rel, acao: 'indexado', totalPaginas: 0 });
  });

  return observador;
}

export { materiaDoCaminho, slugify } from './caminhos.ts';

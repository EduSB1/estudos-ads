import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from '@napi-rs/canvas';
import { createWorker, type Worker } from 'tesseract.js';
import { env } from '../env.ts';
import type { PaginaExtraida } from './extrair.ts';

/**
 * OCR dos PDFs que nao tem camada de texto (slides impressos como imagem).
 *
 * Renderiza cada pagina com pdfjs num canvas e passa o bitmap para o
 * tesseract.js em portugues. So roda sob demanda: e lento (segundos por
 * pagina) e nao deve atrasar a indexacao normal.
 *
 * A pasta de PDFs continua SOMENTE LEITURA: o OCR le os bytes e grava o
 * texto no SQLite, nunca de volta no arquivo.
 */

/** Resolucao do render antes do OCR. 2x da um bom equilibrio nestes slides. */
const ESCALA_RENDER = 2;

let worker: Worker | null = null;

async function obterWorker(): Promise<Worker> {
  if (worker) return worker;
  // Os traineddata ficam em cache no diretorio de dados do projeto.
  const cache = path.join(env.raizProjeto, 'data', 'tesseract');
  fs.mkdirSync(cache, { recursive: true });
  worker = await createWorker('por', undefined, { cachePath: cache });
  return worker;
}

export async function encerrarOcr(): Promise<void> {
  await worker?.terminate();
  worker = null;
}

export type ProgressoOcr = { pagina: number; total: number; caracteres: number };

/**
 * Roda OCR em todas as paginas do PDF e devolve as paginas com texto preenchido.
 * As dimensoes vem do viewport, iguais as da extracao normal.
 */
export async function ocrPdf(
  caminho: string,
  aoProgredir?: (p: ProgressoOcr) => void,
): Promise<PaginaExtraida[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const dados = new Uint8Array(fs.readFileSync(caminho));
  const doc = await pdfjs.getDocument({ data: dados, useSystemFonts: true }).promise;
  const motor = await obterWorker();

  const paginas: PaginaExtraida[] = [];

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const viewport = pagina.getViewport({ scale: ESCALA_RENDER });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const contexto = canvas.getContext('2d');

      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, canvas.width, canvas.height);

      // O canvas do @napi-rs implementa a mesma interface que o pdfjs usa,
      // mas os tipos do DOM nao existem aqui (a API compila so com lib ES).
      await pagina.render({
        canvas: null,
        canvasContext: contexto,
        viewport,
      } as unknown as Parameters<typeof pagina.render>[0]).promise;

      const { data } = await motor.recognize(canvas.toBuffer('image/png'));
      const texto = limpar(data.text);

      const nominal = pagina.getViewport({ scale: 1 });
      paginas.push({
        numero: n,
        texto,
        totalCaracteres: texto.replace(/\s/g, '').length,
        largura: Math.round(nominal.width),
        altura: Math.round(nominal.height),
      });

      aoProgredir?.({ pagina: n, total: doc.numPages, caracteres: texto.length });
      pagina.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  return paginas;
}

/** O tesseract devolve muita quebra solta; junta linhas da mesma frase. */
export function limpar(texto: string): string {
  return texto
    .replace(/\r/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, todas) => l.length > 0 || todas[i - 1]?.length !== 0)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

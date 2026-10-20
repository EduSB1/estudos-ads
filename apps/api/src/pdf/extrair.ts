import fs from 'node:fs';
import { createHash } from 'node:crypto';

/**
 * Extracao por pagina com pdfjs-dist: texto, links (annotations) e posicao.
 * A pasta de PDFs e SOMENTE LEITURA: aqui so lemos bytes.
 */

export type LinkExtraido = {
  pagina: number;
  url: string;
  texto: string | null;
  tipo: 'externo' | 'interno' | 'email' | 'desconhecido';
  retangulo: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    largura: number;
    altura: number;
    pagina: number;
  } | null;
};

export type PaginaExtraida = {
  numero: number;
  texto: string;
  totalCaracteres: number;
  largura: number;
  altura: number;
};

export type PdfExtraido = {
  totalPaginas: number;
  paginas: PaginaExtraida[];
  links: LinkExtraido[];
  /** true quando praticamente nao ha texto extraivel -> provavel PDF escaneado. */
  precisaOcr: boolean;
  mediaCaracteresPorPagina: number;
};

/** Abaixo disso por pagina, tratamos o PDF como escaneado (so imagem). */
export const LIMIAR_OCR_CARACTERES = 40;

export function hashArquivo(caminho: string): string {
  return createHash('sha256').update(fs.readFileSync(caminho)).digest('hex');
}

function classificarUrl(url: string): LinkExtraido['tipo'] {
  if (/^mailto:/i.test(url)) return 'email';
  if (/^https?:\/\//i.test(url)) return 'externo';
  if (/^#/.test(url) || /^file:/i.test(url)) return 'interno';
  return 'desconhecido';
}

/** pdfjs em Node precisa da build legacy e de nao usar worker. */
async function carregarPdfjs() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjs;
}

export async function extrairPdf(caminho: string): Promise<PdfExtraido> {
  const pdfjs = await carregarPdfjs();
  const dados = new Uint8Array(fs.readFileSync(caminho));
  const doc = await pdfjs.getDocument({
    data: dados,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const paginas: PaginaExtraida[] = [];
  const links: LinkExtraido[] = [];

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const viewport = pagina.getViewport({ scale: 1 });

      const conteudo = await pagina.getTextContent();
      const texto = montarTexto(conteudo.items as ItemTexto[]);

      paginas.push({
        numero: n,
        texto,
        totalCaracteres: texto.replace(/\s/g, '').length,
        largura: Math.round(viewport.width),
        altura: Math.round(viewport.height),
      });

      for (const anotacao of await pagina.getAnnotations({ intent: 'display' })) {
        const url = extrairUrl(anotacao);
        if (!url) continue;
        links.push({
          pagina: n,
          url,
          texto: typeof anotacao.contents === 'string' ? anotacao.contents || null : null,
          tipo: classificarUrl(url),
          retangulo: montarRetangulo(anotacao.rect, viewport.width, viewport.height, n),
        });
      }
      pagina.cleanup();
    }
  } finally {
    await doc.destroy();
  }

  const totalCaracteres = paginas.reduce((s, p) => s + p.totalCaracteres, 0);
  const media = paginas.length ? totalCaracteres / paginas.length : 0;

  return {
    totalPaginas: doc.numPages,
    paginas,
    links,
    precisaOcr: media < LIMIAR_OCR_CARACTERES,
    mediaCaracteresPorPagina: Math.round(media),
  };
}

type ItemTexto = { str?: string; hasEOL?: boolean; transform?: number[] };

/** Reconstroi o texto preservando quebras de linha, essencial para a heuristica de questoes. */
export function montarTexto(itens: ItemTexto[]): string {
  let saida = '';
  let yAnterior: number | null = null;

  for (const item of itens) {
    if (typeof item.str !== 'string') continue;
    const y = item.transform?.[5] ?? null;
    if (yAnterior !== null && y !== null && Math.abs(y - yAnterior) > 2) saida += '\n';
    saida += item.str;
    if (item.hasEOL) saida += '\n';
    yAnterior = y;
  }

  return saida
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extrairUrl(anotacao: Record<string, unknown>): string | null {
  if (typeof anotacao.url === 'string' && anotacao.url) return anotacao.url;
  if (typeof anotacao.unsafeUrl === 'string' && anotacao.unsafeUrl) return anotacao.unsafeUrl;
  const acao = anotacao.action;
  if (typeof acao === 'string' && /^https?:/i.test(acao)) return acao;
  if (anotacao.dest != null) return `#${JSON.stringify(anotacao.dest)}`;
  return null;
}

function montarRetangulo(
  rect: unknown,
  largura: number,
  altura: number,
  pagina: number,
): LinkExtraido['retangulo'] {
  if (!Array.isArray(rect) || rect.length < 4) return null;
  const [x1, y1, x2, y2] = rect as number[];
  if ([x1, y1, x2, y2].some((v) => typeof v !== 'number')) return null;
  return {
    x1: Math.min(x1!, x2!),
    y1: Math.min(y1!, y2!),
    x2: Math.max(x1!, x2!),
    y2: Math.max(y1!, y2!),
    largura,
    altura,
    pagina,
  };
}

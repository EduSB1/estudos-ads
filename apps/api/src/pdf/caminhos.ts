import path from 'node:path';

/** Funcoes puras de caminho/nomenclatura. Sem banco e sem env, para serem testaveis a seco. */

const CATEGORIAS = new Set(['aulas', 'exercicios', 'provas', 'extras']);

export function slugify(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export type DadosMateria = {
  slug: string;
  nome: string;
  semestre: string | null;
  codigo: string | null;
  caminho: string;
  categoria: string | null;
};

/**
 * Deriva a materia do caminho relativo do arquivo. Aceita os dois layouts:
 *   <materia>/<arquivo>.pdf                        (pasta solta, como vem da UniOpet)
 *   <semestre>/<materia>/<categoria>/<arquivo>.pdf (convencao do organizar-pdfs)
 */
export function materiaDoCaminho(rel: string): DadosMateria | null {
  const partes = rel.split(path.sep).filter(Boolean);
  if (partes.length < 2) return null;

  const ehSemestre = /^20\d{2}-[1-4]$/.test(partes[0]!);
  const idxMateria = ehSemestre ? 1 : 0;
  const pastaMateria = partes[idxMateria];
  if (!pastaMateria) return null;

  const possivelCategoria = partes[idxMateria + 1];
  const categoria =
    possivelCategoria && CATEGORIAS.has(possivelCategoria) ? possivelCategoria : null;

  const codigo = pastaMateria.match(/\((\d{6,}_[^)]*)\)/)?.[1] ?? null;
  const nome = pastaMateria.replace(/\s*\(\s*\d{6,}_[^)]*\)\s*$/i, '').trim() || pastaMateria;
  const semestre = ehSemestre
    ? partes[0]!
    : (codigo
        ?.match(/(20\d{2})[_-]([1-4])\b/)
        ?.slice(1, 3)
        .join('-') ?? null);

  return {
    slug: slugify(nome),
    nome,
    semestre,
    codigo,
    caminho: partes.slice(0, idxMateria + 1).join(path.sep),
    categoria,
  };
}

/** Titulo legivel a partir do nome do arquivo. */
export function tituloDoArquivo(rel: string): string {
  return path.basename(rel, path.extname(rel)).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

import type { Database } from 'better-sqlite3';

/**
 * Cria a tabela FTS5 do texto das paginas e os gatilhos que a mantem em sincronia.
 * Idempotente: pode rodar a cada boot.
 *
 * Usamos uma tabela "external content" apontando para `paginas`, para nao duplicar o texto.
 */
export function aplicarFts(sqlite: Database): void {
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS paginas_fts USING fts5(
      texto,
      content='paginas',
      content_rowid='id',
      tokenize="unicode61 remove_diacritics 2"
    );

    CREATE TRIGGER IF NOT EXISTS paginas_fts_ai AFTER INSERT ON paginas BEGIN
      INSERT INTO paginas_fts(rowid, texto) VALUES (new.id, new.texto);
    END;

    CREATE TRIGGER IF NOT EXISTS paginas_fts_ad AFTER DELETE ON paginas BEGIN
      INSERT INTO paginas_fts(paginas_fts, rowid, texto) VALUES('delete', old.id, old.texto);
    END;

    CREATE TRIGGER IF NOT EXISTS paginas_fts_au AFTER UPDATE ON paginas BEGIN
      INSERT INTO paginas_fts(paginas_fts, rowid, texto) VALUES('delete', old.id, old.texto);
      INSERT INTO paginas_fts(rowid, texto) VALUES (new.id, new.texto);
    END;
  `);
}

/** Reconstroi o indice FTS a partir da tabela de paginas. */
export function reconstruirFts(sqlite: Database): void {
  sqlite.exec(`INSERT INTO paginas_fts(paginas_fts) VALUES('rebuild');`);
}

/** Escapa um termo de busca do usuario para a sintaxe do FTS5 (match por prefixo). */
export function termoFts(consulta: string): string {
  const termos = consulta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/["'*^]/g, '').trim())
    .filter((t) => t.length > 1);
  if (!termos.length) return '';
  return termos.map((t) => `"${t}"*`).join(' AND ');
}

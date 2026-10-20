import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const agora = sql`(datetime('now'))`;

/* ---------------------------------------------------------------- materias */

export const materias = sqliteTable(
  'materias',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    nome: text('nome').notNull(),
    semestre: text('semestre'),
    codigo: text('codigo'),
    caminho: text('caminho').notNull().unique(),
    criadoEm: text('criado_em').notNull().default(agora),
  },
  (t) => [index('idx_materias_semestre').on(t.semestre)],
);

/* -------------------------------------------------------------- documentos */

export const documentos = sqliteTable(
  'documentos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    materiaId: integer('materia_id')
      .notNull()
      .references(() => materias.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    arquivo: text('arquivo').notNull(),
    caminho: text('caminho').notNull().unique(),
    hash: text('hash').notNull(),
    tamanhoBytes: integer('tamanho_bytes').notNull().default(0),
    totalPaginas: integer('total_paginas').notNull().default(0),
    categoria: text('categoria'),
    status: text('status').notNull().default('pendente'),
    precisaOcr: integer('precisa_ocr', { mode: 'boolean' }).notNull().default(false),
    ultimaPagina: integer('ultima_pagina'),
    ultimaLeituraEm: text('ultima_leitura_em'),
    indexadoEm: text('indexado_em'),
    criadoEm: text('criado_em').notNull().default(agora),
  },
  (t) => [
    index('idx_documentos_materia').on(t.materiaId),
    index('idx_documentos_hash').on(t.hash),
    index('idx_documentos_leitura').on(t.ultimaLeituraEm),
  ],
);

/* ----------------------------------------------------------------- paginas */

export const paginas = sqliteTable(
  'paginas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentoId: integer('documento_id')
      .notNull()
      .references(() => documentos.id, { onDelete: 'cascade' }),
    numero: integer('numero').notNull(),
    texto: text('texto').notNull().default(''),
    totalCaracteres: integer('total_caracteres').notNull().default(0),
    largura: integer('largura').notNull().default(0),
    altura: integer('altura').notNull().default(0),
  },
  (t) => [unique('uq_paginas_doc_num').on(t.documentoId, t.numero)],
);

/* ------------------------------------------------------------------- links */

export const links = sqliteTable(
  'links',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentoId: integer('documento_id')
      .notNull()
      .references(() => documentos.id, { onDelete: 'cascade' }),
    pagina: integer('pagina').notNull(),
    url: text('url').notNull(),
    texto: text('texto'),
    tipo: text('tipo').notNull().default('desconhecido'),
    retangulo: text('retangulo', { mode: 'json' }),
  },
  (t) => [index('idx_links_documento').on(t.documentoId)],
);

/* --------------------------------------------------------------- anotacoes */

export const anotacoes = sqliteTable(
  'anotacoes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    materiaId: integer('materia_id').references(() => materias.id, { onDelete: 'cascade' }),
    documentoId: integer('documento_id').references(() => documentos.id, { onDelete: 'cascade' }),
    titulo: text('titulo'),
    conteudoHtml: text('conteudo_html').notNull().default(''),
    conteudoTexto: text('conteudo_texto').notNull().default(''),
    criadoEm: text('criado_em').notNull().default(agora),
    atualizadoEm: text('atualizado_em').notNull().default(agora),
  },
  (t) => [
    index('idx_anotacoes_documento').on(t.documentoId),
    index('idx_anotacoes_materia').on(t.materiaId),
  ],
);

/* --------------------------------------------------------------- destaques */

export const destaques = sqliteTable(
  'destaques',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentoId: integer('documento_id')
      .notNull()
      .references(() => documentos.id, { onDelete: 'cascade' }),
    pagina: integer('pagina').notNull(),
    cor: text('cor').notNull().default('amarelo'),
    texto: text('texto').notNull().default(''),
    comentario: text('comentario'),
    posicao: text('posicao', { mode: 'json' }).notNull(),
    lembrete: text('lembrete'),
    lembreteEm: text('lembrete_em'),
    lembreteConcluido: integer('lembrete_concluido', { mode: 'boolean' }).notNull().default(false),
    criadoEm: text('criado_em').notNull().default(agora),
  },
  (t) => [
    index('idx_destaques_documento').on(t.documentoId),
    index('idx_destaques_lembrete').on(t.lembreteEm),
  ],
);

/* ---------------------------------------------------------------- questoes */

export const questoes = sqliteTable(
  'questoes',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentoId: integer('documento_id').references(() => documentos.id, { onDelete: 'cascade' }),
    materiaId: integer('materia_id').references(() => materias.id, { onDelete: 'cascade' }),
    pagina: integer('pagina'),
    numero: text('numero'),
    enunciado: text('enunciado').notNull(),
    alternativas: text('alternativas', { mode: 'json' }).notNull().default('[]'),
    gabarito: text('gabarito'),
    explicacao: text('explicacao'),
    origem: text('origem').notNull().default('manual'),
    revisada: integer('revisada', { mode: 'boolean' }).notNull().default(false),
    impressaoDigital: text('impressao_digital').notNull(),
    criadoEm: text('criado_em').notNull().default(agora),
  },
  (t) => [
    index('idx_questoes_documento').on(t.documentoId),
    unique('uq_questoes_impressao').on(t.impressaoDigital),
  ],
);

/* --------------------------------------------------------------- respostas */

export const respostas = sqliteTable(
  'respostas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    questaoId: integer('questao_id')
      .notNull()
      .references(() => questoes.id, { onDelete: 'cascade' }),
    alternativa: text('alternativa'),
    texto: text('texto'),
    marcacao: text('marcacao').notNull(),
    respondidoEm: text('respondido_em').notNull().default(agora),
  },
  (t) => [index('idx_respostas_questao').on(t.questaoId)],
);

/* ---------------------------------------------------------------- snippets */

export const snippets = sqliteTable(
  'snippets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    titulo: text('titulo').notNull().default('Sem titulo'),
    linguagem: text('linguagem').notNull(),
    codigo: text('codigo').notNull().default(''),
    documentoId: integer('documento_id').references(() => documentos.id, { onDelete: 'set null' }),
    materiaId: integer('materia_id').references(() => materias.id, { onDelete: 'set null' }),
    pagina: integer('pagina'),
    criadoEm: text('criado_em').notNull().default(agora),
    atualizadoEm: text('atualizado_em').notNull().default(agora),
  },
  (t) => [index('idx_snippets_documento').on(t.documentoId)],
);

/* ------------------------------------------------------------- cache de ia */

export const cacheIa = sqliteTable('cache_ia', {
  chave: text('chave').primaryKey(),
  tarefa: text('tarefa').notNull(),
  modelo: text('modelo').notNull(),
  resposta: text('resposta', { mode: 'json' }).notNull(),
  criadoEm: text('criado_em').notNull().default(agora),
});

/* ------------------------------------------------------------ preferencias */

export const preferencias = sqliteTable('preferencias', {
  chave: text('chave').primaryKey(),
  valor: text('valor').notNull(),
  atualizadoEm: text('atualizado_em').notNull().default(agora),
});

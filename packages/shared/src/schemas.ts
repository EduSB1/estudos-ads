import { z } from 'zod';

/* ------------------------------------------------------------------ comuns */

export const idSchema = z.number().int().positive();
export const corDestaqueSchema = z.enum(['amarelo', 'verde', 'azul', 'rosa', 'roxo']);
export type CorDestaque = z.infer<typeof corDestaqueSchema>;

/** Retangulo normalizado (0..1) relativo ao tamanho da pagina do PDF. */
export const retanguloSchema = z.object({
  x1: z.number(),
  y1: z.number(),
  x2: z.number(),
  y2: z.number(),
  largura: z.number(),
  altura: z.number(),
  pagina: z.number().int().positive(),
});
export type Retangulo = z.infer<typeof retanguloSchema>;

/* ----------------------------------------------------------------- materia */

export const materiaSchema = z.object({
  id: idSchema,
  slug: z.string().min(1),
  nome: z.string().min(1),
  semestre: z.string().nullable(),
  codigo: z.string().nullable(),
  caminho: z.string().min(1),
  criadoEm: z.string(),
});
export type Materia = z.infer<typeof materiaSchema>;

export const materiaComContagemSchema = materiaSchema.extend({
  totalDocumentos: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
});
export type MateriaComContagem = z.infer<typeof materiaComContagemSchema>;

/* ---------------------------------------------------------------- documento */

export const statusDocumentoSchema = z.enum(['pendente', 'indexado', 'precisa_ocr', 'erro']);
export type StatusDocumento = z.infer<typeof statusDocumentoSchema>;

export const documentoSchema = z.object({
  id: idSchema,
  materiaId: idSchema,
  titulo: z.string().min(1),
  arquivo: z.string().min(1),
  caminho: z.string().min(1),
  hash: z.string().min(1),
  tamanhoBytes: z.number().int().nonnegative(),
  totalPaginas: z.number().int().nonnegative(),
  categoria: z.enum(['aulas', 'exercicios', 'provas', 'extras']).nullable(),
  status: statusDocumentoSchema,
  precisaOcr: z.boolean(),
  ultimaPagina: z.number().int().positive().nullable(),
  ultimaLeituraEm: z.string().nullable(),
  indexadoEm: z.string().nullable(),
  criadoEm: z.string(),
});
export type Documento = z.infer<typeof documentoSchema>;

/* ------------------------------------------------------------------ pagina */

export const paginaSchema = z.object({
  id: idSchema,
  documentoId: idSchema,
  numero: z.number().int().positive(),
  texto: z.string(),
  totalCaracteres: z.number().int().nonnegative(),
  largura: z.number(),
  altura: z.number(),
});
export type Pagina = z.infer<typeof paginaSchema>;

/* -------------------------------------------------------------------- link */

export const linkSchema = z.object({
  id: idSchema,
  documentoId: idSchema,
  pagina: z.number().int().positive(),
  url: z.string(),
  texto: z.string().nullable(),
  tipo: z.enum(['externo', 'interno', 'email', 'desconhecido']),
  retangulo: retanguloSchema.nullable(),
});
export type Link = z.infer<typeof linkSchema>;

/* --------------------------------------------------------------- anotacoes */

/** Anotacao livre (TipTap) ligada a um documento ou direto a materia. */
export const anotacaoSchema = z.object({
  id: idSchema,
  materiaId: idSchema.nullable(),
  documentoId: idSchema.nullable(),
  titulo: z.string().nullable(),
  conteudoHtml: z.string(),
  conteudoTexto: z.string(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});
export type Anotacao = z.infer<typeof anotacaoSchema>;

const anotacaoBaseSchema = z.object({
  materiaId: idSchema.nullish(),
  documentoId: idSchema.nullish(),
  titulo: z.string().max(200).nullish(),
  conteudoHtml: z.string().default(''),
  conteudoTexto: z.string().default(''),
});

export const criarAnotacaoSchema = anotacaoBaseSchema.refine(
  (v) => v.materiaId != null || v.documentoId != null,
  { message: 'informe materiaId ou documentoId' },
);
export type CriarAnotacao = z.infer<typeof criarAnotacaoSchema>;

/** Sem defaults, pelo mesmo motivo de `atualizarDestaqueSchema`. */
export const atualizarAnotacaoSchema = z.object({
  titulo: z.string().max(200).nullish(),
  conteudoHtml: z.string().optional(),
  conteudoTexto: z.string().optional(),
});

/* ---------------------------------------------------------------- destaques */

export const destaqueSchema = z.object({
  id: idSchema,
  documentoId: idSchema,
  pagina: z.number().int().positive(),
  cor: corDestaqueSchema,
  texto: z.string(),
  comentario: z.string().nullable(),
  posicao: z.unknown(),
  lembrete: z.string().nullable(),
  lembreteEm: z.string().nullable(),
  lembreteConcluido: z.boolean(),
  criadoEm: z.string(),
});
export type Destaque = z.infer<typeof destaqueSchema>;

export const criarDestaqueSchema = z.object({
  documentoId: idSchema,
  pagina: z.number().int().positive(),
  cor: corDestaqueSchema.default('amarelo'),
  texto: z.string().default(''),
  comentario: z.string().nullish(),
  posicao: z.unknown(),
  lembrete: z.string().max(500).nullish(),
  lembreteEm: z.string().nullish(),
});
/**
 * Atualizacao NAO herda os `.default()` do schema de criacao: em Zod, `.partial()`
 * mantem o default, o que faria um PATCH parcial sobrescrever campos nao enviados.
 */
export const atualizarDestaqueSchema = z.object({
  cor: corDestaqueSchema.optional(),
  texto: z.string().optional(),
  comentario: z.string().nullish(),
  posicao: z.unknown().optional(),
  lembrete: z.string().max(500).nullish(),
  lembreteEm: z.string().nullish(),
  lembreteConcluido: z.boolean().optional(),
});

/* ----------------------------------------------------------------- questao */

export const origemQuestaoSchema = z.enum(['heuristica', 'ia', 'manual']);
export type OrigemQuestao = z.infer<typeof origemQuestaoSchema>;

export const alternativaSchema = z.object({
  letra: z.string().length(1),
  texto: z.string(),
});
export type Alternativa = z.infer<typeof alternativaSchema>;

export const questaoSchema = z.object({
  id: idSchema,
  documentoId: idSchema.nullable(),
  materiaId: idSchema.nullable(),
  pagina: z.number().int().positive().nullable(),
  numero: z.string().nullable(),
  enunciado: z.string().min(1),
  alternativas: z.array(alternativaSchema),
  gabarito: z.string().nullable(),
  explicacao: z.string().nullable(),
  origem: origemQuestaoSchema,
  revisada: z.boolean(),
  criadoEm: z.string(),
});
export type Questao = z.infer<typeof questaoSchema>;

export const criarQuestaoSchema = z.object({
  documentoId: idSchema.nullish(),
  materiaId: idSchema.nullish(),
  pagina: z.number().int().positive().nullish(),
  numero: z.string().max(20).nullish(),
  enunciado: z.string().min(3),
  alternativas: z.array(alternativaSchema).default([]),
  gabarito: z.string().length(1).nullish(),
  explicacao: z.string().nullish(),
  origem: origemQuestaoSchema.default('manual'),
});
/** Sem defaults, pelo mesmo motivo de `atualizarDestaqueSchema`. */
export const atualizarQuestaoSchema = z.object({
  pagina: z.number().int().positive().nullish(),
  numero: z.string().max(20).nullish(),
  enunciado: z.string().min(3).optional(),
  alternativas: z.array(alternativaSchema).optional(),
  gabarito: z.string().length(1).nullish(),
  explicacao: z.string().nullish(),
  revisada: z.boolean().optional(),
});

/* ---------------------------------------------------------------- resposta */

export const marcacaoSchema = z.enum(['certa', 'errada', 'revisar']);
export type Marcacao = z.infer<typeof marcacaoSchema>;

export const respostaSchema = z.object({
  id: idSchema,
  questaoId: idSchema,
  alternativa: z.string().nullable(),
  texto: z.string().nullable(),
  marcacao: marcacaoSchema,
  respondidoEm: z.string(),
});
export type Resposta = z.infer<typeof respostaSchema>;

export const criarRespostaSchema = z.object({
  questaoId: idSchema,
  alternativa: z.string().length(1).nullish(),
  texto: z.string().nullish(),
  marcacao: marcacaoSchema,
});

/* ----------------------------------------------------------------- snippet */

export const linguagemSnippetSchema = z.enum([
  'javascript',
  'typescript',
  'python',
  'sql',
  'java',
  'c',
  'csharp',
]);

export const snippetSchema = z.object({
  id: idSchema,
  titulo: z.string(),
  linguagem: linguagemSnippetSchema,
  codigo: z.string(),
  documentoId: idSchema.nullable(),
  materiaId: idSchema.nullable(),
  pagina: z.number().int().positive().nullable(),
  criadoEm: z.string(),
  atualizadoEm: z.string(),
});
export type Snippet = z.infer<typeof snippetSchema>;

export const criarSnippetSchema = z.object({
  titulo: z.string().min(1).max(200).default('Sem titulo'),
  linguagem: linguagemSnippetSchema,
  codigo: z.string().default(''),
  documentoId: idSchema.nullish(),
  materiaId: idSchema.nullish(),
  pagina: z.number().int().positive().nullish(),
});
/** Sem defaults, pelo mesmo motivo de `atualizarDestaqueSchema`. */
export const atualizarSnippetSchema = z.object({
  titulo: z.string().min(1).max(200).optional(),
  linguagem: linguagemSnippetSchema.optional(),
  codigo: z.string().optional(),
});

/* --------------------------------------------------------------- execucao */

export const executarCodigoSchema = z.object({
  linguagem: linguagemSnippetSchema,
  codigo: z.string().min(1),
  stdin: z.string().default(''),
});

export const resultadoExecucaoSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  codigoSaida: z.number().int().nullable(),
  duracaoMs: z.number().nonnegative(),
  truncado: z.boolean(),
  erro: z.string().nullable(),
});
export type ResultadoExecucao = z.infer<typeof resultadoExecucaoSchema>;

/* --------------------------------------------------------------------- ia */

/** Saida estruturada esperada da IA ao extrair questoes de um trecho. */
export const questoesExtraidasSchema = z.object({
  questoes: z
    .array(
      z.object({
        numero: z.string().nullable(),
        enunciado: z.string(),
        alternativas: z.array(alternativaSchema),
        gabarito: z.string().nullable(),
        explicacao: z.string().nullable(),
      }),
    )
    .max(20),
});
export type QuestoesExtraidas = z.infer<typeof questoesExtraidasSchema>;

/** Saida estruturada esperada da IA ao gerar exemplos de codigo. */
export const exemplosCodigoSchema = z.object({
  exemplos: z
    .array(
      z.object({
        titulo: z.string(),
        linguagem: linguagemSnippetSchema,
        codigo: z.string(),
        explicacao: z.string(),
      }),
    )
    .max(5),
});
export type ExemplosCodigo = z.infer<typeof exemplosCodigoSchema>;

export const pedidoIaSchema = z.object({
  trecho: z.string().min(10).max(20_000),
  documentoId: idSchema.nullish(),
  materiaId: idSchema.nullish(),
  pagina: z.number().int().positive().nullish(),
  linguagem: linguagemSnippetSchema.optional(),
});

/* ------------------------------------------------------------- preferencias */

export const preferenciasSchema = z.object({
  tema: z.enum(['dark', 'light']).default('dark'),
  ultimoDocumentoId: idSchema.nullable().default(null),
  ultimaPagina: z.number().int().positive().nullable().default(null),
  tamanhoFonteLeitor: z.number().min(0.5).max(3).default(1),
  linguagemPadraoIde: linguagemSnippetSchema.default('python'),
});
export type Preferencias = z.infer<typeof preferenciasSchema>;

export type MateriaLista = {
  id: number;
  slug: string;
  nome: string;
  semestre: string | null;
  codigo: string | null;
  totalDocumentos: number;
  totalPaginas: number;
};

export type DocumentoLista = {
  id: number;
  materiaId: number;
  titulo: string;
  arquivo: string;
  caminho: string;
  totalPaginas: number;
  tamanhoBytes: number;
  categoria: string | null;
  status: string;
  precisaOcr: boolean;
  ultimaPagina: number | null;
  ultimaLeituraEm: string | null;
};

export type DocumentoDetalhe = DocumentoLista & { materiaNome: string };

export type DocumentoRecente = {
  id: number;
  titulo: string;
  totalPaginas: number;
  ultimaPagina: number | null;
  ultimaLeituraEm: string | null;
  materiaId: number;
  materiaNome: string;
};

export type DestaqueApi = {
  id: number;
  documentoId: number;
  pagina: number;
  cor: string;
  texto: string;
  comentario: string | null;
  posicao: unknown;
  lembrete: string | null;
  lembreteEm: string | null;
  lembreteConcluido: boolean;
  criadoEm: string;
};

export type AnotacaoApi = {
  id: number;
  materiaId: number | null;
  documentoId: number | null;
  titulo: string | null;
  conteudoHtml: string;
  conteudoTexto: string;
  atualizadoEm: string;
};

export type QuestaoApi = {
  id: number;
  documentoId: number | null;
  documentoTitulo: string | null;
  materiaId: number | null;
  materiaNome: string | null;
  pagina: number | null;
  numero: string | null;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  gabarito: string | null;
  explicacao: string | null;
  origem: 'heuristica' | 'ia' | 'manual';
  revisada: boolean;
  totalRespostas: number;
  ultimaMarcacao: 'certa' | 'errada' | 'revisar' | null;
};

export type RespostaApi = {
  id: number;
  questaoId: number;
  alternativa: string | null;
  texto: string | null;
  marcacao: 'certa' | 'errada' | 'revisar';
  respondidoEm: string;
};

export type ItemRevisao = DestaqueApi & {
  documentoTitulo: string;
  materiaNome: string;
};

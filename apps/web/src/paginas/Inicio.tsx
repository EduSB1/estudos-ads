import { BookOpen, FileText, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Carregando } from '@/componentes/ui/carregando';
import { Cartao, CartaoDescricao, CartaoTitulo } from '@/componentes/ui/cartao';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';
import type { DocumentoRecente, MateriaLista } from '@/lib/tipos';
import { formatarData } from '@/lib/utils';

export function Inicio() {
  const materias = useApi<MateriaLista[]>('/materias');
  const recentes = useApi<DocumentoRecente[]>('/documentos/recentes?limite=4');
  const ultimo = recentes.dados?.[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="text-sm text-suave">Retome de onde parou ou escolha uma matéria.</p>
      </header>

      {/* Retomar leitura: o caminho mais curto de volta ao estudo. */}
      {ultimo ? (
        <section aria-labelledby="retomar">
          <h2 id="retomar" className="mb-2 text-xs font-medium uppercase tracking-wide text-suave">
            Continuar lendo
          </h2>
          <Cartao className="flex flex-col gap-4 border-destaque/30 bg-destaque/5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CartaoTitulo className="truncate text-base">{ultimo.titulo}</CartaoTitulo>
              <CartaoDescricao className="mt-1">
                {ultimo.materiaNome} · página {ultimo.ultimaPagina ?? 1} de {ultimo.totalPaginas} ·
                lido em {formatarData(ultimo.ultimaLeituraEm)}
              </CartaoDescricao>
            </div>
            <Link
              to={`/leitor/${ultimo.id}?pagina=${ultimo.ultimaPagina ?? 1}`}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-destaque px-6 text-base font-medium text-destaque-texto transition-colors hover:bg-destaque/90"
            >
              <Play className="size-4" aria-hidden />
              Retomar
            </Link>
          </Cartao>
        </section>
      ) : null}

      <section aria-labelledby="materias">
        <h2 id="materias" className="mb-2 text-xs font-medium uppercase tracking-wide text-suave">
          Matérias
        </h2>

        {materias.carregando ? <Carregando /> : null}
        {materias.erro ? (
          <Vazio
            titulo="Não consegui falar com a API"
            descricao={`${materias.erro}. Confira se a API está rodando em ${import.meta.env.VITE_API_URL ?? 'http://localhost:3333'}.`}
          />
        ) : null}

        {materias.dados?.length === 0 ? (
          <Vazio
            icone={<BookOpen className="size-8" />}
            titulo="Nenhuma matéria indexada ainda"
            descricao="Rode `pnpm indexar` para varrer a pasta de PDFs. A pasta é lida, nunca alterada."
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materias.dados?.map((materia) => (
            <Link
              key={materia.id}
              to={`/materias/${materia.id}`}
              className="cartao group p-4 transition-colors hover:border-destaque/50 hover:bg-superficie/80"
            >
              <div className="flex items-start justify-between gap-2">
                <CartaoTitulo className="text-base group-hover:text-destaque">
                  {materia.nome}
                </CartaoTitulo>
                {materia.semestre ? <Etiqueta>{materia.semestre}</Etiqueta> : null}
              </div>
              <CartaoDescricao className="mt-2 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <FileText className="size-3" aria-hidden />
                  {materia.totalDocumentos} documentos
                </span>
                <span>{materia.totalPaginas} páginas</span>
              </CartaoDescricao>
            </Link>
          ))}
        </div>
      </section>

      {recentes.dados && recentes.dados.length > 1 ? (
        <section aria-labelledby="recentes">
          <h2 id="recentes" className="mb-2 text-xs font-medium uppercase tracking-wide text-suave">
            Lidos recentemente
          </h2>
          <ul className="divide-y divide-borda overflow-hidden rounded-lg border border-borda">
            {recentes.dados.slice(1).map((doc) => (
              <li key={doc.id}>
                <Link
                  to={`/leitor/${doc.id}?pagina=${doc.ultimaPagina ?? 1}`}
                  className="flex items-center justify-between gap-4 bg-superficie/40 px-4 py-3 text-sm transition-colors hover:bg-superficie"
                >
                  <span className="min-w-0 truncate">{doc.titulo}</span>
                  <span className="shrink-0 text-xs text-suave">
                    pág. {doc.ultimaPagina ?? 1}/{doc.totalPaginas}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

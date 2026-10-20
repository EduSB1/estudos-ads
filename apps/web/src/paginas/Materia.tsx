import { ArrowLeft, FileText, ScanLine } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Botao } from '@/componentes/ui/botao';
import { Carregando } from '@/componentes/ui/carregando';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';
import type { DocumentoLista, MateriaLista } from '@/lib/tipos';
import { formatarBytes, formatarData } from '@/lib/utils';

const CATEGORIAS = ['todas', 'aulas', 'exercicios', 'provas', 'extras'] as const;

export function Materia() {
  const { id } = useParams();
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('todas');

  const materia = useApi<MateriaLista>(id ? `/materias/${id}` : null);
  const documentos = useApi<DocumentoLista[]>(
    id
      ? `/materias/${id}/documentos${categoria === 'todas' ? '' : `?categoria=${categoria}`}`
      : null,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          to="/materias"
          className="mb-2 inline-flex items-center gap-1 text-xs text-suave hover:text-texto"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Matérias
        </Link>
        <h1 className="text-2xl font-semibold">{materia.dados?.nome ?? '…'}</h1>
        <p className="text-sm text-suave">
          {materia.dados?.totalDocumentos ?? 0} documentos · {materia.dados?.totalPaginas ?? 0}{' '}
          páginas
        </p>
      </div>

      <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
        {CATEGORIAS.map((c) => (
          <Botao
            key={c}
            tamanho="sm"
            variante={categoria === c ? 'primario' : 'secundario'}
            aria-pressed={categoria === c}
            onClick={() => setCategoria(c)}
          >
            {c}
          </Botao>
        ))}
      </div>

      {documentos.carregando ? <Carregando /> : null}
      {documentos.dados?.length === 0 ? <Vazio titulo="Nenhum documento nesta categoria" /> : null}

      <ul className="divide-y divide-borda overflow-hidden rounded-lg border border-borda">
        {documentos.dados?.map((doc) => (
          <li key={doc.id}>
            <Link
              to={`/leitor/${doc.id}${doc.ultimaPagina ? `?pagina=${doc.ultimaPagina}` : ''}`}
              className="flex items-center gap-3 bg-superficie/40 px-4 py-3 transition-colors hover:bg-superficie"
            >
              <FileText className="size-4 shrink-0 text-suave" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{doc.titulo}</p>
                <p className="mt-0.5 text-xs text-suave">
                  {doc.totalPaginas} páginas · {formatarBytes(doc.tamanhoBytes)}
                  {doc.ultimaLeituraEm
                    ? ` · lido em ${formatarData(doc.ultimaLeituraEm)} (pág. ${doc.ultimaPagina})`
                    : ''}
                </p>
              </div>
              {doc.precisaOcr ? (
                <Etiqueta tom="atencao" title="Sem texto extraível: provável PDF escaneado">
                  <ScanLine className="size-3" aria-hidden />
                  OCR
                </Etiqueta>
              ) : null}
              {doc.categoria ? <Etiqueta>{doc.categoria}</Etiqueta> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

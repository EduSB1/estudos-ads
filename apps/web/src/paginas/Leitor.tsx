import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  Code2,
  Highlighter,
  NotebookPen,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PainelAnotacoes } from '@/componentes/PainelAnotacoes';
import { Botao } from '@/componentes/ui/botao';
import { Campo } from '@/componentes/ui/campo';
import { Carregando } from '@/componentes/ui/carregando';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { api } from '@/lib/api';
import { CORES_DESTAQUE, LISTA_CORES, type CorDestaque } from '@/lib/cores';
import type { DestaqueApi, DocumentoDetalhe } from '@/lib/tipos';
import { cn } from '@/lib/utils';

// react-pdf precisa do worker do pdfjs servido localmente (sem CDN).
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type Selecao = { texto: string; pagina: number; retangulos: DOMRect[] };

export function Leitor() {
  const { id } = useParams();
  const documentoId = Number(id);
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();

  const [documento, setDocumento] = useState<DocumentoDetalhe | null>(null);
  const [destaques, setDestaques] = useState<DestaqueApi[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [pagina, setPagina] = useState(() => Number(params.get('pagina')) || 1);
  const [escala, setEscala] = useState(1.2);
  const [selecao, setSelecao] = useState<Selecao | null>(null);
  const [cor, setCor] = useState<CorDestaque>('amarelo');
  const [lembrete, setLembrete] = useState('');
  const [painel, setPainel] = useState<'destaques' | 'anotacoes'>('destaques');

  const areaRef = useRef<HTMLDivElement>(null);
  const salvarLeitura = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arquivo = useMemo(() => api.urlArquivo(documentoId), [documentoId]);

  useEffect(() => {
    if (!Number.isFinite(documentoId)) return;
    void api.get<DocumentoDetalhe>(`/documentos/${documentoId}`).then(setDocumento);
    void api.get<DestaqueApi[]>(`/destaques?documentoId=${documentoId}`).then(setDestaques);
  }, [documentoId]);

  // Lembra a ultima pagina lida (debounce para nao escrever a cada rolagem).
  useEffect(() => {
    if (!documentoId || !pagina) return;
    setParams({ pagina: String(pagina) }, { replace: true });
    if (salvarLeitura.current) clearTimeout(salvarLeitura.current);
    salvarLeitura.current = setTimeout(() => {
      void api.patch(`/documentos/${documentoId}/leitura`, { pagina }).catch(() => undefined);
    }, 800);
  }, [documentoId, pagina, setParams]);

  const irPara = useCallback(
    (n: number) => setPagina((atual) => Math.min(Math.max(1, n), totalPaginas || atual)),
    [totalPaginas],
  );

  // Setas e PageUp/PageDown navegam quando o foco nao esta num campo.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.isContentEditable)
        return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        irPara(pagina + 1);
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        irPara(pagina - 1);
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [irPara, pagina]);

  /** Captura o texto selecionado no PDF para virar destaque ou snippet. */
  const aoSoltarMouse = useCallback(() => {
    const sel = window.getSelection();
    const texto = sel?.toString().trim() ?? '';
    if (!texto || !sel || sel.rangeCount === 0) {
      setSelecao(null);
      return;
    }
    const retangulos = Array.from(sel.getRangeAt(0).getClientRects());
    setSelecao({ texto, pagina, retangulos });
  }, [pagina]);

  const criarDestaque = useCallback(async () => {
    if (!selecao) return;
    const area = areaRef.current?.getBoundingClientRect();
    const posicao = {
      retangulos: selecao.retangulos.map((r) => ({
        x: area ? r.left - area.left : r.left,
        y: area ? r.top - area.top : r.top,
        largura: r.width,
        altura: r.height,
      })),
      escala,
    };

    const criado = await api.post<DestaqueApi>('/destaques', {
      documentoId,
      pagina: selecao.pagina,
      cor,
      texto: selecao.texto,
      posicao,
      lembrete: lembrete.trim() || null,
      lembreteEm: lembrete.trim() ? new Date().toISOString() : null,
    });

    setDestaques((atual) => [...atual, criado]);
    setSelecao(null);
    setLembrete('');
    window.getSelection()?.removeAllRanges();
  }, [cor, documentoId, escala, lembrete, selecao]);

  /** "Abrir na IDE": manda o trecho selecionado para a mini IDE. */
  const abrirNaIde = useCallback(() => {
    if (!selecao) return;
    sessionStorage.setItem(
      'ide:codigo-importado',
      JSON.stringify({
        codigo: selecao.texto,
        documentoId,
        pagina: selecao.pagina,
        titulo: documento?.titulo ?? 'Trecho do PDF',
      }),
    );
    navegar('/ide?importar=1');
  }, [documento?.titulo, documentoId, navegar, selecao]);

  const removerDestaque = useCallback(async (destaqueId: number) => {
    await api.delete(`/destaques/${destaqueId}`);
    setDestaques((atual) => atual.filter((d) => d.id !== destaqueId));
  }, []);

  const destaquesDaPagina = destaques.filter((d) => d.pagina === pagina);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <Link
          to={documento ? `/materias/${documento.materiaId}` : '/materias'}
          className="inline-flex items-center gap-1 text-xs text-suave hover:text-texto"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {documento?.materiaNome ?? 'Voltar'}
        </Link>

        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">
          {documento?.titulo ?? 'Carregando…'}
        </h1>

        {documento?.precisaOcr ? <Etiqueta tom="atencao">sem texto · OCR</Etiqueta> : null}

        <div className="flex items-center gap-1">
          <Botao
            tamanho="icone"
            variante="fantasma"
            aria-label="Diminuir zoom"
            onClick={() => setEscala((e) => Math.max(0.6, e - 0.2))}
          >
            <ZoomOut aria-hidden />
          </Botao>
          <span className="w-12 text-center text-xs text-suave">{Math.round(escala * 100)}%</span>
          <Botao
            tamanho="icone"
            variante="fantasma"
            aria-label="Aumentar zoom"
            onClick={() => setEscala((e) => Math.min(3, e + 0.2))}
          >
            <ZoomIn aria-hidden />
          </Botao>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* -------------------------------------------------------- documento */}
        <div
          ref={areaRef}
          onMouseUp={aoSoltarMouse}
          className="relative min-w-0 flex-1 overflow-auto rounded-lg border border-borda bg-superficie/40 p-4"
        >
          <Document
            file={arquivo}
            onLoadSuccess={({ numPages }) => setTotalPaginas(numPages)}
            loading={<Carregando texto="Abrindo PDF…" />}
            error={
              <p className="p-8 text-center text-sm text-perigo">
                Não consegui abrir este PDF. Verifique se a API está rodando.
              </p>
            }
            className="flex justify-center"
          >
            <Page
              pageNumber={pagina}
              scale={escala}
              renderTextLayer
              renderAnnotationLayer
              className="shadow-lg"
            />
          </Document>

          {/* Barra de ação da seleção. */}
          {selecao ? (
            <div className="sticky bottom-2 left-0 right-0 mx-auto flex w-fit flex-wrap items-center gap-2 rounded-lg border border-borda bg-fundo/95 p-2 shadow-xl backdrop-blur">
              <div className="flex items-center gap-1" role="group" aria-label="Cor do destaque">
                {LISTA_CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={CORES_DESTAQUE[c].rotulo}
                    aria-pressed={cor === c}
                    onClick={() => setCor(c)}
                    className={cn(
                      'size-6 rounded-full transition-transform',
                      CORES_DESTAQUE[c].classe,
                      cor === c
                        ? 'scale-110 ring-2 ring-texto ring-offset-2 ring-offset-fundo'
                        : '',
                    )}
                  />
                ))}
              </div>

              <Campo
                value={lembrete}
                onChange={(e) => setLembrete(e.target.value)}
                placeholder="Lembrete (opcional)"
                aria-label="Lembrete para este destaque"
                className="h-8 w-48 text-xs"
              />

              <Botao tamanho="sm" variante="primario" onClick={() => void criarDestaque()}>
                <Highlighter aria-hidden />
                Destacar
              </Botao>

              <Botao tamanho="sm" onClick={abrirNaIde} title="Abrir o trecho na mini IDE">
                <Code2 aria-hidden />
                Abrir na IDE
              </Botao>
            </div>
          ) : null}
        </div>

        {/* ----------------------------------------------------------- painel */}
        <aside className="hidden w-80 shrink-0 flex-col rounded-lg border border-borda bg-superficie/40 p-3 xl:flex">
          <div className="mb-2 flex gap-1" role="tablist" aria-label="Painel lateral">
            <Botao
              tamanho="sm"
              role="tab"
              aria-selected={painel === 'destaques'}
              variante={painel === 'destaques' ? 'primario' : 'fantasma'}
              onClick={() => setPainel('destaques')}
            >
              <Highlighter aria-hidden />
              Destaques
            </Botao>
            <Botao
              tamanho="sm"
              role="tab"
              aria-selected={painel === 'anotacoes'}
              variante={painel === 'anotacoes' ? 'primario' : 'fantasma'}
              onClick={() => setPainel('anotacoes')}
            >
              <NotebookPen aria-hidden />
              Anotações
            </Botao>
          </div>

          {painel === 'anotacoes' ? (
            <PainelAnotacoes documentoId={documentoId} />
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              <p className="text-[11px] uppercase tracking-wide text-suave">
                Página {pagina} · {destaquesDaPagina.length} destaque(s)
              </p>
              {destaques.length === 0 ? (
                <p className="py-8 text-center text-xs text-suave">
                  Selecione um trecho do PDF para destacar.
                </p>
              ) : null}
              {destaques.map((d) => (
                <article
                  key={d.id}
                  className={cn(
                    'rounded-md border border-borda p-2 text-xs',
                    d.pagina === pagina ? 'bg-fundo' : 'bg-transparent opacity-70',
                  )}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2.5 rounded-full',
                        CORES_DESTAQUE[d.cor as CorDestaque]?.classe,
                      )}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => irPara(d.pagina)}
                      className="text-[11px] text-suave hover:text-destaque"
                    >
                      pág. {d.pagina}
                    </button>
                    <Botao
                      tamanho="icone"
                      variante="fantasma"
                      className="ml-auto size-6"
                      aria-label="Remover destaque"
                      onClick={() => void removerDestaque(d.id)}
                    >
                      <Trash2 aria-hidden />
                    </Botao>
                  </div>
                  <p className="line-clamp-4 leading-snug">{d.texto}</p>
                  {d.lembrete ? (
                    <p className="mt-1 flex items-start gap-1 text-[11px] text-atencao">
                      <Bell className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {d.lembrete}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ------------------------------------------------------- paginacao */}
      <nav
        aria-label="Navegação de páginas"
        className="flex items-center justify-center gap-2 text-sm"
      >
        <Botao
          tamanho="icone"
          aria-label="Página anterior"
          disabled={pagina <= 1}
          onClick={() => irPara(pagina - 1)}
        >
          <ChevronLeft aria-hidden />
        </Botao>

        <label className="flex items-center gap-2 text-xs text-suave">
          <span className="sr-only">Número da página</span>
          <Campo
            type="number"
            min={1}
            max={totalPaginas || 1}
            value={pagina}
            onChange={(e) => irPara(Number(e.target.value))}
            className="h-8 w-16 text-center"
          />
          de {totalPaginas || '—'}
        </label>

        <Botao
          tamanho="icone"
          aria-label="Próxima página"
          disabled={pagina >= totalPaginas}
          onClick={() => irPara(pagina + 1)}
        >
          <ChevronRight aria-hidden />
        </Botao>
      </nav>
    </div>
  );
}

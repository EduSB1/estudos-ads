import {
  ArrowLeft,
  Bell,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  NotebookPen,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PdfHighlighter, PdfLoader } from 'react-pdf-highlighter-extended';
import type { PdfHighlighterUtils, PdfSelection } from 'react-pdf-highlighter-extended';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { BarraSelecao } from '@/componentes/BarraSelecao';
import { ContainerDestaque, type DestaqueNoPdf } from '@/componentes/ContainerDestaque';
import { PainelAnotacoes } from '@/componentes/PainelAnotacoes';
import { Botao } from '@/componentes/ui/botao';
import { Campo } from '@/componentes/ui/campo';
import { Carregando } from '@/componentes/ui/carregando';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { api } from '@/lib/api';
import { CORES_DESTAQUE, type CorDestaque } from '@/lib/cores';
import type { DestaqueApi, DocumentoDetalhe } from '@/lib/tipos';
import { cn } from '@/lib/utils';

// O worker do pdfjs e servido pelo proprio build; nada vem de CDN.
const WORKER = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/** Converte o registro da API no formato que o PdfHighlighter espera. */
function paraDestaqueNoPdf(d: DestaqueApi): DestaqueNoPdf {
  const posicao = d.posicao as DestaqueNoPdf['position'];
  return {
    id: String(d.id),
    destaqueId: d.id,
    cor: (d.cor as CorDestaque) ?? 'amarelo',
    lembrete: d.lembrete,
    comentario: d.comentario,
    type: 'text',
    content: { text: d.texto },
    position: posicao,
  };
}

export function Leitor() {
  const { id } = useParams();
  const documentoId = Number(id);
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();

  const [documento, setDocumento] = useState<DocumentoDetalhe | null>(null);
  const [destaques, setDestaques] = useState<DestaqueApi[]>([]);
  const [pagina, setPagina] = useState(() => Number(params.get('pagina')) || 1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [escala, setEscala] = useState(1.2);
  const [painel, setPainel] = useState<'destaques' | 'anotacoes'>('destaques');

  const utilsRef = useRef<PdfHighlighterUtils | null>(null);
  const selecaoRef = useRef<PdfSelection | null>(null);
  const salvarLeitura = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paginaInicial = useRef(Number(params.get('pagina')) || 0);

  const arquivo = useMemo(() => api.urlArquivo(documentoId), [documentoId]);
  const destaquesNoPdf = useMemo(() => destaques.map(paraDestaqueNoPdf), [destaques]);

  useEffect(() => {
    if (!Number.isFinite(documentoId)) return;
    void api.get<DocumentoDetalhe>(`/documentos/${documentoId}`).then((doc) => {
      setDocumento(doc);
      setTotalPaginas(doc.totalPaginas);
    });
    void api.get<DestaqueApi[]>(`/destaques?documentoId=${documentoId}`).then(setDestaques);
  }, [documentoId]);

  // Guarda a ultima pagina lida, com folga para nao escrever a cada rolagem.
  useEffect(() => {
    if (!documentoId || !pagina) return;
    setParams({ pagina: String(pagina) }, { replace: true });
    if (salvarLeitura.current) clearTimeout(salvarLeitura.current);
    salvarLeitura.current = setTimeout(() => {
      void api.patch(`/documentos/${documentoId}/leitura`, { pagina }).catch(() => undefined);
    }, 800);
  }, [documentoId, pagina, setParams]);

  const irPara = useCallback(
    (n: number) => {
      const viewer = utilsRef.current?.getViewer();
      const alvo = Math.min(Math.max(1, n), totalPaginas || n);
      if (viewer) viewer.currentPageNumber = alvo;
      setPagina(alvo);
    },
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

  /** Liga o viewer do pdf.js: acompanha a pagina atual e retoma onde parou. */
  const ligarViewer = useCallback((utils: PdfHighlighterUtils) => {
    utilsRef.current = utils;
    const viewer = utils.getViewer();
    if (!viewer) return;

    viewer.eventBus.on('pagechanging', (evento: { pageNumber: number }) => {
      setPagina(evento.pageNumber);
    });

    if (paginaInicial.current > 1) {
      const alvo = paginaInicial.current;
      paginaInicial.current = 0;
      // O viewer só aceita o salto depois de montar as páginas.
      viewer.eventBus.on('pagesloaded', () => {
        viewer.currentPageNumber = alvo;
      });
    }
  }, []);

  const criarDestaque = useCallback(
    async (cor: CorDestaque, lembrete: string) => {
      const selecao = selecaoRef.current;
      if (!selecao) return;

      const criado = await api.post<DestaqueApi>('/destaques', {
        documentoId,
        pagina: selecao.position.boundingRect.pageNumber,
        cor,
        texto: selecao.content.text ?? '',
        posicao: selecao.position,
        lembrete: lembrete || null,
        lembreteEm: lembrete ? new Date().toISOString() : null,
      });

      setDestaques((atual) => [...atual, criado]);
      utilsRef.current?.removeGhostHighlight();
      utilsRef.current?.setTip(null);
      selecaoRef.current = null;
    },
    [documentoId],
  );

  /** "Abrir na IDE": manda o trecho selecionado para a mini IDE. */
  const abrirNaIde = useCallback(() => {
    const selecao = selecaoRef.current;
    if (!selecao) return;
    sessionStorage.setItem(
      'ide:codigo-importado',
      JSON.stringify({
        codigo: selecao.content.text ?? '',
        documentoId,
        pagina: selecao.position.boundingRect.pageNumber,
        titulo: documento?.titulo ?? 'Trecho do PDF',
      }),
    );
    navegar('/ide?importar=1');
  }, [documento?.titulo, documentoId, navegar]);

  const removerDestaque = useCallback(async (destaqueId: number) => {
    await api.delete(`/destaques/${destaqueId}`);
    setDestaques((atual) => atual.filter((d) => d.id !== destaqueId));
  }, []);

  const irParaDestaque = useCallback(
    (destaqueId: number) => {
      const alvo = destaquesNoPdf.find((d) => d.destaqueId === destaqueId);
      if (alvo) utilsRef.current?.scrollToHighlight(alvo);
    },
    [destaquesNoPdf],
  );

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
            onClick={() => setEscala((e) => Math.max(0.6, Number((e - 0.2).toFixed(2))))}
          >
            <ZoomOut aria-hidden />
          </Botao>
          <span className="w-12 text-center text-xs text-suave">{Math.round(escala * 100)}%</span>
          <Botao
            tamanho="icone"
            variante="fantasma"
            aria-label="Aumentar zoom"
            onClick={() => setEscala((e) => Math.min(3, Number((e + 0.2).toFixed(2))))}
          >
            <ZoomIn aria-hidden />
          </Botao>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* -------------------------------------------------------- documento */}
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-borda bg-superficie/40">
          <PdfLoader
            document={arquivo}
            workerSrc={WORKER}
            beforeLoad={() => <Carregando texto="Abrindo PDF…" />}
            errorMessage={(erro) => (
              <p className="p-8 text-center text-sm text-perigo">
                Não consegui abrir este PDF: {erro.message}
              </p>
            )}
          >
            {(pdfDocument) => (
              <PdfHighlighter
                pdfDocument={pdfDocument}
                highlights={destaquesNoPdf}
                utilsRef={ligarViewer}
                pdfScaleValue={escala}
                textSelectionColor="rgba(56, 189, 248, 0.3)"
                style={{ height: '100%', position: 'relative' }}
                onSelection={(selecao) => {
                  selecaoRef.current = selecao;
                }}
                selectionTip={
                  <BarraSelecao aoDestacar={criarDestaque} aoAbrirNaIde={abrirNaIde} />
                }
              >
                <ContainerDestaque
                  aoRemover={removerDestaque}
                  aoSelecionar={irParaDestaque}
                />
              </PdfHighlighter>
            )}
          </PdfLoader>
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
                {destaques.length} destaque(s) neste documento
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
                      onClick={() => irParaDestaque(d.id)}
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
          disabled={totalPaginas > 0 && pagina >= totalPaginas}
          onClick={() => irPara(pagina + 1)}
        >
          <ChevronRight aria-hidden />
        </Botao>
      </nav>
    </div>
  );
}

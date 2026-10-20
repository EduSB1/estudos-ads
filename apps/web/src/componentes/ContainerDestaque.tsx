import { Bell, Trash2 } from 'lucide-react';
import { TextHighlight, useHighlightContainerContext } from 'react-pdf-highlighter-extended';
import type { Highlight } from 'react-pdf-highlighter-extended';
import { CORES_DESTAQUE, type CorDestaque } from '@/lib/cores';
import { cn } from '@/lib/utils';

/** Destaque como ele e guardado: o id da API e a cor viajam junto da posicao. */
export type DestaqueNoPdf = Highlight & {
  destaqueId: number;
  cor: CorDestaque;
  lembrete: string | null;
  comentario: string | null;
};

/**
 * Renderiza um destaque sobre o texto do PDF. O PdfHighlighter monta este
 * componente uma vez por destaque, com o contexto da pagina correspondente.
 */
export function ContainerDestaque({
  aoRemover,
  aoSelecionar,
}: {
  aoRemover: (destaqueId: number) => void;
  aoSelecionar: (destaqueId: number) => void;
}) {
  const { highlight, isScrolledTo } = useHighlightContainerContext<DestaqueNoPdf>();
  const cor = CORES_DESTAQUE[highlight.cor] ?? CORES_DESTAQUE.amarelo;

  return (
    <div className="group relative">
      <TextHighlight
        highlight={highlight}
        isScrolledTo={isScrolledTo}
        style={{ background: cor.css }}
        onClick={() => aoSelecionar(highlight.destaqueId)}
      />

      {/* Ações aparecem ao passar o mouse sobre o destaque. */}
      <div
        className={cn(
          'pointer-events-none absolute -top-8 left-0 z-10 flex items-center gap-1 rounded-md',
          'border border-borda bg-fundo/95 px-1.5 py-1 opacity-0 shadow-lg backdrop-blur transition-opacity',
          'group-hover:pointer-events-auto group-hover:opacity-100',
        )}
      >
        {highlight.lembrete ? (
          <span className="flex items-center gap-1 px-1 text-[11px] text-atencao">
            <Bell className="size-3" aria-hidden />
            {highlight.lembrete}
          </span>
        ) : null}
        <button
          type="button"
          aria-label="Remover destaque"
          title="Remover destaque"
          onClick={() => aoRemover(highlight.destaqueId)}
          className="rounded p-1 text-suave transition-colors hover:bg-perigo/15 hover:text-perigo"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

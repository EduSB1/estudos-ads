import { Code2, Highlighter } from 'lucide-react';
import { useState } from 'react';
import { Botao } from '@/componentes/ui/botao';
import { Campo } from '@/componentes/ui/campo';
import { CORES_DESTAQUE, LISTA_CORES, type CorDestaque } from '@/lib/cores';
import { cn } from '@/lib/utils';

/**
 * Dica que o PdfHighlighter exibe ao soltar uma seleção: escolher cor,
 * anexar um lembrete ou mandar o trecho para a mini IDE.
 */
export function BarraSelecao({
  aoDestacar,
  aoAbrirNaIde,
}: {
  aoDestacar: (cor: CorDestaque, lembrete: string) => void;
  aoAbrirNaIde: () => void;
}) {
  const [cor, setCor] = useState<CorDestaque>('amarelo');
  const [lembrete, setLembrete] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-borda bg-fundo/95 p-2 shadow-xl backdrop-blur">
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
              cor === c ? 'scale-110 ring-2 ring-texto ring-offset-2 ring-offset-fundo' : '',
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

      <Botao tamanho="sm" variante="primario" onClick={() => aoDestacar(cor, lembrete.trim())}>
        <Highlighter aria-hidden />
        Destacar
      </Botao>

      <Botao tamanho="sm" onClick={aoAbrirNaIde} title="Abrir o trecho na mini IDE">
        <Code2 aria-hidden />
        Abrir na IDE
      </Botao>
    </div>
  );
}

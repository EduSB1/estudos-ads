import type { ReactNode } from 'react';

/** Estado vazio padrao: explica o que falta e oferece a proxima acao. */
export function Vazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-borda px-6 py-14 text-center">
      {icone ? <div className="text-suave/60">{icone}</div> : null}
      <div>
        <p className="text-sm font-medium text-texto">{titulo}</p>
        {descricao ? <p className="mt-1 max-w-md text-xs text-suave">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}

import { Bell, BellOff, Highlighter } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Botao } from '@/componentes/ui/botao';
import { Carregando } from '@/componentes/ui/carregando';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { CORES_DESTAQUE, type CorDestaque } from '@/lib/cores';
import type { ItemRevisao } from '@/lib/tipos';
import { cn, formatarData } from '@/lib/utils';

type Resposta = {
  total: number;
  comLembrete: number;
  pendentes: number;
  itens: ItemRevisao[];
};

export function Revisao() {
  const [apenasLembretes, setApenasLembretes] = useState(false);
  const { dados, carregando, recarregar } = useApi<Resposta>(
    `/revisao${apenasLembretes ? '?apenasLembretes=true' : ''}`,
  );

  const alternarConcluido = async (item: ItemRevisao) => {
    await api.patch(`/destaques/${item.id}`, { lembreteConcluido: !item.lembreteConcluido });
    recarregar();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Revisão</h1>
          <p className="text-sm text-suave">
            {dados
              ? `${dados.total} destaques · ${dados.comLembrete} com lembrete · ${dados.pendentes} pendentes`
              : 'Tudo que você destacou, num lugar só.'}
          </p>
        </div>

        <Botao
          tamanho="sm"
          variante={apenasLembretes ? 'primario' : 'secundario'}
          aria-pressed={apenasLembretes}
          onClick={() => setApenasLembretes((v) => !v)}
        >
          <Bell aria-hidden />
          Só com lembrete
        </Botao>
      </header>

      {carregando ? <Carregando /> : null}
      {dados?.itens.length === 0 ? (
        <Vazio
          icone={<Highlighter className="size-8" />}
          titulo="Nenhum destaque ainda"
          descricao="Abra um PDF no leitor, selecione um trecho e clique em Destacar."
        />
      ) : null}

      <ul className="space-y-3">
        {dados?.itens.map((item) => (
          <li key={item.id} className={cn('cartao p-4', item.lembreteConcluido && 'opacity-60')}>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-suave">
              <span
                className={cn(
                  'size-2.5 rounded-full',
                  CORES_DESTAQUE[item.cor as CorDestaque]?.classe,
                )}
                aria-hidden
              />
              <span>{item.materiaNome}</span>
              <span aria-hidden>·</span>
              <Link
                to={`/leitor/${item.documentoId}?pagina=${item.pagina}`}
                className="text-destaque hover:underline"
              >
                {item.documentoTitulo} · pág. {item.pagina}
              </Link>
              <span className="ml-auto">{formatarData(item.criadoEm)}</span>
            </div>

            <blockquote className="border-l-2 border-borda pl-3 text-sm leading-relaxed">
              {item.texto}
            </blockquote>

            {item.comentario ? <p className="mt-2 text-xs text-suave">{item.comentario}</p> : null}

            {item.lembrete ? (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-atencao/10 px-3 py-2">
                <Bell className="size-3.5 shrink-0 text-atencao" aria-hidden />
                <p className={cn('flex-1 text-xs', item.lembreteConcluido && 'line-through')}>
                  {item.lembrete}
                </p>
                <Botao
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => void alternarConcluido(item)}
                >
                  {item.lembreteConcluido ? <BellOff aria-hidden /> : <Bell aria-hidden />}
                  {item.lembreteConcluido ? 'Reabrir' : 'Concluir'}
                </Botao>
              </div>
            ) : (
              <Etiqueta className="mt-3">sem lembrete</Etiqueta>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

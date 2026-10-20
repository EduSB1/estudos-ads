import { Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Carregando } from '@/componentes/ui/carregando';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';

type Resultado = {
  termo: string;
  total: number;
  resultados: {
    documentoId: number;
    documentoTitulo: string;
    materiaId: number;
    materiaNome: string;
    pagina: number;
    trecho: string;
  }[];
};

export function Busca() {
  const [params] = useSearchParams();
  const termo = params.get('q') ?? '';
  const { dados, carregando } = useApi<Resultado>(
    termo.length >= 2 ? `/busca?q=${encodeURIComponent(termo)}` : null,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Busca</h1>
        <p className="text-sm text-suave">
          {termo ? (
            <>
              {dados?.total ?? 0} resultado(s) para <strong>“{termo}”</strong>
            </>
          ) : (
            'Use a barra no topo para buscar dentro dos PDFs.'
          )}
        </p>
      </header>

      {carregando ? <Carregando /> : null}
      {termo && dados?.total === 0 ? (
        <Vazio
          icone={<Search className="size-8" />}
          titulo="Nada encontrado"
          descricao="Tente outras palavras. A busca cobre só o texto extraído — PDFs escaneados não entram."
        />
      ) : null}

      <ul className="space-y-2">
        {dados?.resultados.map((r, i) => (
          <li key={`${r.documentoId}-${r.pagina}-${i}`}>
            <Link
              to={`/leitor/${r.documentoId}?pagina=${r.pagina}`}
              className="cartao block p-4 transition-colors hover:border-destaque/50"
            >
              <p className="mb-1 text-xs text-suave">
                {r.materiaNome} · {r.documentoTitulo} · pág. {r.pagina}
              </p>
              <p
                className="text-sm leading-relaxed [&_mark]:rounded [&_mark]:bg-destaque/30 [&_mark]:px-0.5 [&_mark]:text-texto"
                // A API devolve o trecho com <mark> vindo do snippet() do FTS5.
                dangerouslySetInnerHTML={{ __html: r.trecho }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

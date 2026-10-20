import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Carregando } from '@/componentes/ui/carregando';
import { CartaoDescricao, CartaoTitulo } from '@/componentes/ui/cartao';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';
import type { MateriaLista } from '@/lib/tipos';

export function Materias() {
  const { dados, carregando, erro } = useApi<MateriaLista[]>('/materias');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Matérias</h1>
        <p className="text-sm text-suave">Uma matéria por pasta da sua pasta de PDFs.</p>
      </header>

      {carregando ? <Carregando /> : null}
      {erro ? <Vazio titulo="Falha ao carregar" descricao={erro} /> : null}
      {dados?.length === 0 ? (
        <Vazio
          icone={<BookOpen className="size-8" />}
          titulo="Nada indexado"
          descricao="Rode `pnpm indexar` para varrer a pasta de PDFs."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {dados?.map((m) => (
          <Link
            key={m.id}
            to={`/materias/${m.id}`}
            className="cartao p-4 transition-colors hover:border-destaque/50"
          >
            <div className="flex items-start justify-between gap-2">
              <CartaoTitulo className="text-base">{m.nome}</CartaoTitulo>
              {m.semestre ? <Etiqueta tom="destaque">{m.semestre}</Etiqueta> : null}
            </div>
            <CartaoDescricao className="mt-2">
              {m.totalDocumentos} documentos · {m.totalPaginas} páginas
            </CartaoDescricao>
            {m.codigo ? (
              <CartaoDescricao className="mt-1 font-mono text-[10px]">{m.codigo}</CartaoDescricao>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

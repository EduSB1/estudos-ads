import { BookOpen, Code2, Highlighter, Home, ListChecks, Search, Settings } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const ITENS = [
  { para: '/', rotulo: 'Início', icone: Home, atalho: '1' },
  { para: '/materias', rotulo: 'Matérias', icone: BookOpen, atalho: '2' },
  { para: '/revisao', rotulo: 'Revisão', icone: Highlighter, atalho: '3' },
  { para: '/questoes', rotulo: 'Questões', icone: ListChecks, atalho: '4' },
  { para: '/ide', rotulo: 'Mini IDE', icone: Code2, atalho: '5' },
  { para: '/configuracoes', rotulo: 'Configurações', icone: Settings, atalho: '6' },
];

export function Layout() {
  const navegar = useNavigate();
  const buscaRef = useRef<HTMLInputElement>(null);

  // Atalhos globais: Alt+numero navega, "/" foca a busca.
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      const digitando =
        alvo?.tagName === 'INPUT' ||
        alvo?.tagName === 'TEXTAREA' ||
        alvo?.isContentEditable === true;

      if (evento.key === '/' && !digitando) {
        evento.preventDefault();
        buscaRef.current?.focus();
        return;
      }
      if (evento.altKey && !evento.ctrlKey && !evento.metaKey) {
        const item = ITENS.find((i) => i.atalho === evento.key);
        if (item) {
          evento.preventDefault();
          navegar(item.para);
        }
      }
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [navegar]);

  return (
    <div className="flex min-h-screen bg-fundo">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-destaque focus:px-3 focus:py-2 focus:text-sm focus:text-destaque-texto"
      >
        Pular para o conteúdo
      </a>

      <nav
        aria-label="Navegação principal"
        className="sticky top-0 flex h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-borda bg-superficie/60 py-3 lg:w-56 lg:items-stretch lg:px-3"
      >
        <div className="mb-4 flex items-center gap-2 px-1 lg:px-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-destaque text-sm font-bold text-destaque-texto">
            A
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold leading-tight">Estudos ADS</p>
            <p className="text-[11px] leading-tight text-suave">UniOpet</p>
          </div>
        </div>

        {ITENS.map(({ para, rotulo, icone: Icone, atalho }) => (
          <NavLink
            key={para}
            to={para}
            end={para === '/'}
            title={`${rotulo} (Alt+${atalho})`}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                'justify-center lg:justify-start',
                isActive
                  ? 'bg-destaque/15 text-destaque'
                  : 'text-suave hover:bg-borda/40 hover:text-texto',
              )
            }
          >
            <Icone className="size-4 shrink-0" aria-hidden />
            <span className="hidden lg:inline">{rotulo}</span>
            <kbd className="ml-auto hidden text-[10px] text-suave/60 lg:inline">Alt+{atalho}</kbd>
          </NavLink>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-borda bg-fundo/90 px-4 backdrop-blur">
          <form
            role="search"
            className="relative w-full max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              const valor = buscaRef.current?.value.trim();
              if (valor) navegar(`/busca?q=${encodeURIComponent(valor)}`);
            }}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suave"
              aria-hidden
            />
            <input
              ref={buscaRef}
              type="search"
              name="q"
              placeholder="Buscar no conteúdo dos PDFs…   (/)"
              aria-label="Buscar no conteúdo dos PDFs"
              className="h-9 w-full rounded-md border border-borda bg-superficie pl-9 pr-3 text-sm placeholder:text-suave/70 focus:border-destaque"
            />
          </form>
        </header>

        <main id="conteudo" className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

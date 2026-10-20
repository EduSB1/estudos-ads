import { Check, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Botao } from '@/componentes/ui/botao';
import { Cartao, CartaoDescricao, CartaoTitulo } from '@/componentes/ui/cartao';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { usePreferencias } from '@/hooks/usePreferencias';
import { api } from '@/lib/api';

const ATALHOS = [
  ['Alt + 1…6', 'Navegar entre as telas'],
  ['/', 'Focar a busca'],
  ['← →', 'Página anterior/próxima no leitor'],
  ['Ctrl + Enter', 'Executar o código na mini IDE'],
];

export function Configuracoes() {
  const { prefs, salvar } = usePreferencias();
  const [ia, setIa] = useState<{ disponivel: boolean; modelo: string } | null>(null);
  const [saude, setSaude] = useState<'ok' | 'erro' | 'checando'>('checando');

  useEffect(() => {
    void api
      .get<{ disponivel: boolean; modelo: string }>('/ia/status')
      .then(setIa)
      .catch(() => setIa(null));
    void api
      .get('/saude')
      .then(() => setSaude('ok'))
      .catch(() => setSaude('erro'));
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-suave">Preferências salvas no SQLite local.</p>
      </header>

      <Cartao className="space-y-3">
        <CartaoTitulo>Aparência</CartaoTitulo>
        <div className="flex gap-2">
          <Botao
            variante={prefs.tema === 'dark' ? 'primario' : 'secundario'}
            aria-pressed={prefs.tema === 'dark'}
            onClick={() => void salvar({ tema: 'dark' })}
          >
            <Moon aria-hidden />
            Escuro
          </Botao>
          <Botao
            variante={prefs.tema === 'light' ? 'primario' : 'secundario'}
            aria-pressed={prefs.tema === 'light'}
            onClick={() => void salvar({ tema: 'light' })}
          >
            <Sun aria-hidden />
            Claro
          </Botao>
        </div>
      </Cartao>

      <Cartao className="space-y-2">
        <CartaoTitulo>Serviços</CartaoTitulo>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span>API</span>
            <Etiqueta tom={saude === 'ok' ? 'sucesso' : saude === 'erro' ? 'perigo' : 'neutro'}>
              {saude === 'ok' ? 'no ar' : saude === 'erro' ? 'fora do ar' : 'checando…'}
            </Etiqueta>
          </li>
          <li className="flex items-center justify-between">
            <span>IA (Gemini)</span>
            <Etiqueta tom={ia?.disponivel ? 'sucesso' : 'neutro'}>
              {ia?.disponivel ? ia.modelo : 'desligada'}
            </Etiqueta>
          </li>
        </ul>
        {!ia?.disponivel ? (
          <CartaoDescricao>
            Defina <code className="font-mono">GEMINI_API_KEY</code> no <code>.env</code> da raiz
            para ligar a extração de questões e a geração de exemplos.
          </CartaoDescricao>
        ) : null}
      </Cartao>

      <Cartao className="space-y-3">
        <CartaoTitulo>Atalhos de teclado</CartaoTitulo>
        <ul className="space-y-1.5">
          {ATALHOS.map(([tecla, descricao]) => (
            <li key={tecla} className="flex items-center justify-between text-sm">
              <span className="text-suave">{descricao}</span>
              <kbd className="rounded border border-borda bg-superficie px-2 py-0.5 font-mono text-xs">
                {tecla}
              </kbd>
            </li>
          ))}
        </ul>
      </Cartao>

      <Cartao className="space-y-2">
        <CartaoTitulo>Pasta de PDFs</CartaoTitulo>
        <CartaoDescricao className="flex items-start gap-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-sucesso" aria-hidden />A pasta definida em{' '}
          <code className="font-mono">PDF_DIR</code> é aberta somente para leitura. A aplicação
          nunca cria, move, renomeia ou apaga nada lá dentro.
        </CartaoDescricao>
      </Cartao>
    </div>
  );
}

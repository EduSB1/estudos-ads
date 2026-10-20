import Editor from '@monaco-editor/react';
import { Eraser, FileCode2, Loader2, Play, Save, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Botao } from '@/componentes/ui/botao';
import { Area } from '@/componentes/ui/campo';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import {
  executarJs,
  executarPython,
  executarSql,
  executarViaPiston,
  reiniciarSql,
} from '@/execucao/motores';
import { vazio, type Resultado } from '@/execucao/tipos';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const LINGUAGENS = [
  { id: 'javascript', rotulo: 'JavaScript', monaco: 'javascript', onde: 'navegador' },
  { id: 'typescript', rotulo: 'TypeScript', monaco: 'typescript', onde: 'navegador' },
  { id: 'python', rotulo: 'Python', monaco: 'python', onde: 'navegador' },
  { id: 'sql', rotulo: 'SQL', monaco: 'sql', onde: 'navegador' },
  { id: 'java', rotulo: 'Java', monaco: 'java', onde: 'Piston' },
  { id: 'c', rotulo: 'C', monaco: 'c', onde: 'Piston' },
  { id: 'csharp', rotulo: 'C#', monaco: 'csharp', onde: 'Piston' },
] as const;

type IdLinguagem = (typeof LINGUAGENS)[number]['id'];

const EXEMPLOS: Record<IdLinguagem, string> = {
  javascript: 'console.log("Olá, ADS!");',
  typescript: 'const nome: string = "ADS";\nconsole.log(`Olá, ${nome}!`);',
  python: 'print("Olá, ADS!")',
  sql: "CREATE TABLE aluno (id INTEGER, nome TEXT);\nINSERT INTO aluno VALUES (1, 'Eduardo');\nSELECT * FROM aluno;",
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Olá, ADS!");\n  }\n}',
  c: '#include <stdio.h>\n\nint main(void) {\n  printf("Olá, ADS!\\n");\n  return 0;\n}',
  csharp:
    'using System;\n\nclass Main {\n  static void Main() {\n    Console.WriteLine("Olá, ADS!");\n  }\n}',
};

type Importado = { codigo: string; documentoId?: number; pagina?: number; titulo?: string };

export function MiniIde() {
  const [params] = useSearchParams();
  const [linguagem, setLinguagem] = useState<IdLinguagem>('python');
  const [codigo, setCodigo] = useState(EXEMPLOS.python);
  const [stdin, setStdin] = useState('');
  const [resultado, setResultado] = useState<Resultado>(vazio());
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState('');
  const [origem, setOrigem] = useState<Importado | null>(null);
  const [iaDisponivel, setIaDisponivel] = useState(false);
  const [gerandoIa, setGerandoIa] = useState(false);
  const saidaRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    void api
      .get<{ disponivel: boolean }>('/ia/status')
      .then((s) => setIaDisponivel(s.disponivel))
      .catch(() => setIaDisponivel(false));
  }, []);

  // Recebe o trecho vindo do botao "Abrir na IDE" do Leitor.
  useEffect(() => {
    if (params.get('importar') !== '1') return;
    const bruto = sessionStorage.getItem('ide:codigo-importado');
    if (!bruto) return;
    try {
      const dados = JSON.parse(bruto) as Importado;
      setCodigo(dados.codigo);
      setOrigem(dados);
      sessionStorage.removeItem('ide:codigo-importado');
    } catch {
      /* trecho invalido: ignora */
    }
  }, [params]);

  const trocarLinguagem = useCallback((nova: IdLinguagem) => {
    setLinguagem(nova);
    setCodigo((atual) => {
      const ehExemplo = Object.values(EXEMPLOS).includes(atual);
      return ehExemplo ? EXEMPLOS[nova] : atual;
    });
  }, []);

  const rodar = useCallback(async () => {
    setRodando(true);
    setProgresso('');
    setResultado(vazio());

    try {
      let saida: Resultado;
      if (linguagem === 'javascript' || linguagem === 'typescript') {
        saida = await executarJs(codigo, linguagem);
      } else if (linguagem === 'python') {
        saida = await executarPython(codigo, setProgresso);
      } else if (linguagem === 'sql') {
        saida = await executarSql(codigo);
      } else {
        saida = await executarViaPiston(linguagem, codigo, stdin);
      }
      setResultado(saida);
    } finally {
      setRodando(false);
      setProgresso('');
      requestAnimationFrame(() => saidaRef.current?.scrollTo({ top: 0 }));
    }
  }, [codigo, linguagem, stdin]);

  // Ctrl+Enter roda, como em qualquer REPL.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!rodando) void rodar();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [rodar, rodando]);

  const salvarSnippet = useCallback(async () => {
    await api.post('/snippets', {
      titulo: origem?.titulo ?? `Snippet ${linguagem}`,
      linguagem,
      codigo,
      documentoId: origem?.documentoId ?? null,
      pagina: origem?.pagina ?? null,
    });
  }, [codigo, linguagem, origem]);

  /** Botao "gerar código de exemplo": pede exemplos à IA a partir do trecho aberto. */
  const gerarComIa = useCallback(async () => {
    if (!origem?.codigo && codigo.length < 10) return;
    setGerandoIa(true);
    try {
      const resposta = await api.post<{
        exemplos: { titulo: string; linguagem: string; codigo: string; explicacao: string }[];
      }>('/ia/gerar-codigo', {
        trecho: origem?.codigo ?? codigo,
        documentoId: origem?.documentoId ?? null,
        pagina: origem?.pagina ?? null,
        linguagem,
      });

      const primeiro = resposta.exemplos[0];
      if (primeiro) {
        setCodigo(primeiro.codigo);
        setResultado({
          ...vazio(),
          stdout: resposta.exemplos
            .map((e, i) => `/* ${i + 1}. ${e.titulo}\n   ${e.explicacao} */`)
            .join('\n\n'),
        });
      }
    } catch (erro) {
      setResultado({ ...vazio(), erro: erro instanceof Error ? erro.message : String(erro) });
    } finally {
      setGerandoIa(false);
    }
  }, [codigo, linguagem, origem]);

  const atual = LINGUAGENS.find((l) => l.id === linguagem)!;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-lg font-semibold">Mini IDE</h1>

        <label className="flex items-center gap-2 text-xs text-suave">
          <span className="sr-only">Linguagem</span>
          <select
            value={linguagem}
            onChange={(e) => trocarLinguagem(e.target.value as IdLinguagem)}
            aria-label="Linguagem"
            className="h-8 rounded-md border border-borda bg-superficie px-2 text-xs text-texto"
          >
            {LINGUAGENS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.rotulo}
              </option>
            ))}
          </select>
        </label>

        <Etiqueta tom={atual.onde === 'navegador' ? 'destaque' : 'neutro'}>
          roda no {atual.onde}
        </Etiqueta>

        {origem ? (
          <Etiqueta tom="sucesso" title={origem.titulo}>
            <FileCode2 className="size-3" aria-hidden />
            trecho do PDF
          </Etiqueta>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Botao
            tamanho="sm"
            variante="fantasma"
            onClick={() => {
              setCodigo('');
              setResultado(vazio());
              if (linguagem === 'sql') reiniciarSql();
            }}
          >
            <Eraser aria-hidden />
            Limpar
          </Botao>

          <Botao
            tamanho="sm"
            onClick={() => void gerarComIa()}
            disabled={!iaDisponivel || gerandoIa}
            title={
              iaDisponivel
                ? 'Gerar exemplos de código com IA'
                : 'Configure GEMINI_API_KEY no .env para ligar a IA'
            }
          >
            {gerandoIa ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Sparkles aria-hidden />
            )}
            Gerar exemplo
          </Botao>

          <Botao tamanho="sm" onClick={() => void salvarSnippet()}>
            <Save aria-hidden />
            Salvar
          </Botao>

          <Botao
            tamanho="sm"
            variante="primario"
            onClick={() => void rodar()}
            disabled={rodando}
            title="Executar (Ctrl+Enter)"
          >
            {rodando ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
            Executar
          </Botao>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <div className="min-h-0 overflow-hidden rounded-lg border border-borda">
          <Editor
            height="100%"
            language={atual.monaco}
            theme="vs-dark"
            value={codigo}
            onChange={(valor) => setCodigo(valor ?? '')}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
              automaticLayout: true,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              padding: { top: 12 },
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          {atual.onde === 'Piston' ? (
            <label className="text-xs text-suave">
              Entrada padrão (stdin)
              <Area
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                rows={2}
                className="mt-1 font-mono text-xs"
              />
            </label>
          ) : null}

          <section
            aria-label="Saída da execução"
            className="flex min-h-0 flex-1 flex-col rounded-lg border border-borda bg-superficie/40"
          >
            <div className="flex items-center gap-2 border-b border-borda px-3 py-2 text-xs text-suave">
              <span>Saída</span>
              {resultado.duracaoMs ? <span>· {resultado.duracaoMs} ms</span> : null}
              {resultado.truncado ? <Etiqueta tom="atencao">truncada</Etiqueta> : null}
              {progresso ? (
                <span className="ml-auto flex items-center gap-1 text-destaque">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  {progresso}
                </span>
              ) : null}
            </div>

            <pre
              ref={saidaRef}
              aria-live="polite"
              className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs leading-relaxed"
            >
              {resultado.erro ? <span className="text-perigo">{resultado.erro}</span> : null}
              {resultado.stdout ? <span>{resultado.stdout}</span> : null}
              {resultado.stderr ? (
                <span className={cn('block', resultado.stdout && 'mt-2', 'text-perigo')}>
                  {resultado.stderr}
                </span>
              ) : null}
              {!resultado.erro && !resultado.stdout && !resultado.stderr && !rodando ? (
                <span className="text-suave">Escreva código e aperte Executar (Ctrl+Enter).</span>
              ) : null}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
}

import { Check, Loader2, Pencil, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Botao } from '@/componentes/ui/botao';
import { Area, Campo } from '@/componentes/ui/campo';
import { Carregando } from '@/componentes/ui/carregando';
import { Etiqueta } from '@/componentes/ui/etiqueta';
import { Vazio } from '@/componentes/ui/vazio';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api';
import type { MateriaLista, QuestaoApi, RespostaApi } from '@/lib/tipos';
import { cn, formatarData } from '@/lib/utils';

type Marcacao = 'certa' | 'errada' | 'revisar';

const MARCACOES: {
  valor: Marcacao;
  rotulo: string;
  icone: typeof Check;
  tom: 'sucesso' | 'perigo' | 'atencao';
}[] = [
  { valor: 'certa', rotulo: 'Acertei', icone: Check, tom: 'sucesso' },
  { valor: 'errada', rotulo: 'Errei', icone: X, tom: 'perigo' },
  { valor: 'revisar', rotulo: 'Revisar', icone: RotateCcw, tom: 'atencao' },
];

export function Questoes() {
  const [materiaId, setMateriaId] = useState<string>('');
  const materias = useApi<MateriaLista[]>('/materias');
  const questoes = useApi<QuestaoApi[]>(`/questoes${materiaId ? `?materiaId=${materiaId}` : ''}`);
  const [iaDisponivel, setIaDisponivel] = useState(false);

  useEffect(() => {
    void api
      .get<{ disponivel: boolean }>('/ia/status')
      .then((s) => setIaDisponivel(s.disponivel))
      .catch(() => undefined);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Questões</h1>
          <p className="text-sm text-suave">
            Extraídas dos PDFs por heurística. Edite o que vier torto.
          </p>
        </div>

        <label className="text-xs text-suave">
          <span className="sr-only">Filtrar por matéria</span>
          <select
            value={materiaId}
            onChange={(e) => setMateriaId(e.target.value)}
            aria-label="Filtrar por matéria"
            className="h-9 rounded-md border border-borda bg-superficie px-2 text-xs text-texto"
          >
            <option value="">Todas as matérias</option>
            {materias.dados?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>
      </header>

      {questoes.carregando ? <Carregando /> : null}

      {questoes.dados?.length === 0 ? (
        <Vazio
          titulo="Nenhuma questão encontrada"
          descricao={
            iaDisponivel
              ? 'A heurística não achou questões neste material. Abra um documento e use "extrair com IA".'
              : 'A heurística não achou questões. Configure GEMINI_API_KEY para habilitar a extração com IA.'
          }
        />
      ) : null}

      <div className="space-y-4">
        {questoes.dados?.map((questao) => (
          <CartaoQuestao key={questao.id} questao={questao} aoMudar={questoes.recarregar} />
        ))}
      </div>
    </div>
  );
}

function CartaoQuestao({ questao, aoMudar }: { questao: QuestaoApi; aoMudar: () => void }) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [historico, setHistorico] = useState<RespostaApi[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [rascunho, setRascunho] = useState({
    enunciado: questao.enunciado,
    gabarito: questao.gabarito ?? '',
    alternativas: questao.alternativas,
  });

  const responder = useCallback(
    async (marcacao: Marcacao) => {
      await api.post<RespostaApi>('/respostas', {
        questaoId: questao.id,
        alternativa: escolhida,
        marcacao,
      });
      setHistorico(null);
      aoMudar();
    },
    [aoMudar, escolhida, questao.id],
  );

  const verHistorico = useCallback(async () => {
    const lista = await api.get<RespostaApi[]>(`/questoes/${questao.id}/respostas`);
    setHistorico(lista);
  }, [questao.id]);

  const salvar = useCallback(async () => {
    setSalvando(true);
    try {
      await api.patch(`/questoes/${questao.id}`, {
        enunciado: rascunho.enunciado,
        gabarito: rascunho.gabarito || null,
        alternativas: rascunho.alternativas,
        revisada: true,
      });
      setEditando(false);
      aoMudar();
    } finally {
      setSalvando(false);
    }
  }, [aoMudar, questao.id, rascunho]);

  return (
    <article className="cartao space-y-3 p-4">
      <div className="flex items-start gap-2">
        {questao.numero ? (
          <span className="mt-0.5 shrink-0 font-mono text-xs text-suave">{questao.numero}.</span>
        ) : null}

        {editando ? (
          <Area
            value={rascunho.enunciado}
            onChange={(e) => setRascunho((r) => ({ ...r, enunciado: e.target.value }))}
            aria-label="Enunciado"
            className="text-sm"
          />
        ) : (
          <p className="flex-1 text-sm leading-relaxed">{questao.enunciado}</p>
        )}

        <Botao
          tamanho="icone"
          variante="fantasma"
          className="size-7 shrink-0"
          aria-label={editando ? 'Cancelar edição' : 'Editar questão'}
          onClick={() => setEditando((v) => !v)}
        >
          {editando ? <X aria-hidden /> : <Pencil aria-hidden />}
        </Botao>
      </div>

      <ul className="space-y-1.5">
        {(editando ? rascunho.alternativas : questao.alternativas).map((alt, indice) => {
          const correta = (editando ? rascunho.gabarito : questao.gabarito) === alt.letra;
          const marcada = escolhida === alt.letra;

          return (
            <li key={alt.letra}>
              {editando ? (
                <div className="flex items-center gap-2">
                  <span className="w-5 font-mono text-xs text-suave">{alt.letra})</span>
                  <Campo
                    value={alt.texto}
                    aria-label={`Alternativa ${alt.letra}`}
                    className="h-8 text-xs"
                    onChange={(e) =>
                      setRascunho((r) => ({
                        ...r,
                        alternativas: r.alternativas.map((a, i) =>
                          i === indice ? { ...a, texto: e.target.value } : a,
                        ),
                      }))
                    }
                  />
                  <Botao
                    tamanho="sm"
                    variante={correta ? 'primario' : 'fantasma'}
                    aria-pressed={correta}
                    title="Marcar como gabarito"
                    onClick={() => setRascunho((r) => ({ ...r, gabarito: alt.letra }))}
                  >
                    <Check aria-hidden />
                  </Botao>
                </div>
              ) : (
                <button
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => setEscolhida(marcada ? null : alt.letra)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    marcada
                      ? 'border-destaque bg-destaque/10'
                      : 'border-borda hover:border-suave/50 hover:bg-superficie',
                    questao.gabarito && marcada && correta && 'border-sucesso bg-sucesso/10',
                    questao.gabarito && marcada && !correta && 'border-perigo bg-perigo/10',
                  )}
                >
                  <span className="font-mono text-xs text-suave">{alt.letra})</span>
                  <span className="flex-1">{alt.texto}</span>
                  {questao.gabarito && marcada ? (
                    correta ? (
                      <Check className="size-4 text-sucesso" aria-label="correta" />
                    ) : (
                      <X className="size-4 text-perigo" aria-label="incorreta" />
                    )
                  ) : null}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {questao.explicacao && !editando ? (
        <p className="rounded-md bg-superficie px-3 py-2 text-xs text-suave">
          {questao.explicacao}
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2 border-t border-borda pt-3">
        {editando ? (
          <Botao tamanho="sm" variante="primario" onClick={() => void salvar()} disabled={salvando}>
            {salvando ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
            Salvar correção
          </Botao>
        ) : (
          <>
            {MARCACOES.map(({ valor, rotulo, icone: Icone, tom }) => (
              <Botao
                key={valor}
                tamanho="sm"
                variante="secundario"
                onClick={() => void responder(valor)}
                className={cn(
                  questao.ultimaMarcacao === valor &&
                    (tom === 'sucesso'
                      ? 'border-sucesso/40 text-sucesso'
                      : tom === 'perigo'
                        ? 'border-perigo/40 text-perigo'
                        : 'border-atencao/40 text-atencao'),
                )}
              >
                <Icone aria-hidden />
                {rotulo}
              </Botao>
            ))}

            <Botao tamanho="sm" variante="fantasma" onClick={() => void verHistorico()}>
              Histórico ({questao.totalRespostas})
            </Botao>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          <Etiqueta tom={questao.origem === 'ia' ? 'destaque' : 'neutro'}>
            {questao.origem === 'ia' ? <Sparkles className="size-3" aria-hidden /> : null}
            {questao.origem}
          </Etiqueta>
          {questao.revisada ? <Etiqueta tom="sucesso">revisada</Etiqueta> : null}
          {questao.pagina ? <Etiqueta>pág. {questao.pagina}</Etiqueta> : null}
        </div>
      </footer>

      {historico ? (
        <ul className="space-y-1 border-t border-borda pt-2 text-xs text-suave">
          {historico.length === 0 ? <li>Nenhuma tentativa ainda.</li> : null}
          {historico.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <Etiqueta
                tom={
                  r.marcacao === 'certa'
                    ? 'sucesso'
                    : r.marcacao === 'errada'
                      ? 'perigo'
                      : 'atencao'
                }
              >
                {r.marcacao}
              </Etiqueta>
              {r.alternativa ? <span>alternativa {r.alternativa}</span> : null}
              <span className="ml-auto">{formatarData(r.respondidoEm)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

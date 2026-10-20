import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Check, Italic, List, ListOrdered, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Botao } from '@/componentes/ui/botao';
import { api } from '@/lib/api';
import type { AnotacaoApi } from '@/lib/tipos';
import { cn } from '@/lib/utils';

type Props = { documentoId?: number; materiaId?: number };

/** Editor livre (TipTap) por documento ou matéria, salvo na API com debounce. */
export function PainelAnotacoes({ documentoId, materiaId }: Props) {
  const [anotacao, setAnotacao] = useState<AnotacaoApi | null>(null);
  const [estado, setEstado] = useState<'ocioso' | 'salvando' | 'salvo'>('ocioso');
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const consulta = documentoId
    ? `/anotacoes?documentoId=${documentoId}`
    : materiaId
      ? `/anotacoes?materiaId=${materiaId}`
      : null;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Escreva suas anotações sobre este material…' }),
    ],
    editorProps: {
      attributes: {
        class:
          'prose-sm max-w-none min-h-[12rem] focus:outline-none text-sm leading-relaxed ' +
          '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_p]:my-1 ' +
          '[&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold ' +
          '[&_code]:rounded [&_code]:bg-borda/60 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs',
        'aria-label': 'Editor de anotações',
      },
    },
  });

  useEffect(() => {
    if (!consulta || !editor) return;
    api
      .get<AnotacaoApi[]>(consulta)
      .then((lista) => {
        const primeira = lista[0] ?? null;
        setAnotacao(primeira);
        editor.commands.setContent(primeira?.conteudoHtml ?? '');
      })
      .catch(() => undefined);
  }, [consulta, editor]);

  const salvar = useCallback(async () => {
    if (!editor) return;
    setEstado('salvando');
    const corpo = {
      documentoId: documentoId ?? null,
      materiaId: materiaId ?? null,
      conteudoHtml: editor.getHTML(),
      conteudoTexto: editor.getText(),
    };

    try {
      const salva = anotacao
        ? await api.patch<AnotacaoApi>(`/anotacoes/${anotacao.id}`, corpo)
        : await api.post<AnotacaoApi>('/anotacoes', corpo);
      setAnotacao(salva);
      setEstado('salvo');
      setTimeout(() => setEstado('ocioso'), 1600);
    } catch {
      setEstado('ocioso');
    }
  }, [anotacao, documentoId, editor, materiaId]);

  // Autosalvamento 1,2s depois da ultima tecla.
  useEffect(() => {
    if (!editor) return;
    const aoAtualizar = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => void salvar(), 1200);
    };
    editor.on('update', aoAtualizar);
    return () => {
      editor.off('update', aoAtualizar);
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [editor, salvar]);

  if (!editor) return null;

  const botoes = [
    {
      icone: Bold,
      rotulo: 'Negrito',
      acao: () => editor.chain().focus().toggleBold().run(),
      ativo: editor.isActive('bold'),
    },
    {
      icone: Italic,
      rotulo: 'Itálico',
      acao: () => editor.chain().focus().toggleItalic().run(),
      ativo: editor.isActive('italic'),
    },
    {
      icone: List,
      rotulo: 'Lista',
      acao: () => editor.chain().focus().toggleBulletList().run(),
      ativo: editor.isActive('bulletList'),
    },
    {
      icone: ListOrdered,
      rotulo: 'Lista numerada',
      acao: () => editor.chain().focus().toggleOrderedList().run(),
      ativo: editor.isActive('orderedList'),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-borda pb-2">
        {botoes.map(({ icone: Icone, rotulo, acao, ativo }) => (
          <Botao
            key={rotulo}
            tamanho="icone"
            variante="fantasma"
            aria-label={rotulo}
            aria-pressed={ativo}
            title={rotulo}
            className={cn('size-7', ativo && 'bg-destaque/15 text-destaque')}
            onClick={acao}
          >
            <Icone aria-hidden />
          </Botao>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-suave" aria-live="polite">
          {estado === 'salvando' ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden /> salvando
            </>
          ) : estado === 'salvo' ? (
            <>
              <Check className="size-3 text-sucesso" aria-hidden /> salvo
            </>
          ) : null}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

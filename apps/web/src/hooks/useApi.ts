import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi } from '@/lib/api';

type Estado<T> = { dados: T | null; carregando: boolean; erro: string | null };

/** GET simples com recarga manual. Suficiente para uma ferramenta de um usuario so. */
export function useApi<T>(caminho: string | null): Estado<T> & { recarregar: () => void } {
  const [estado, setEstado] = useState<Estado<T>>({
    dados: null,
    carregando: caminho !== null,
    erro: null,
  });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!caminho) {
      setEstado({ dados: null, carregando: false, erro: null });
      return;
    }
    let ativo = true;
    setEstado((e) => ({ ...e, carregando: true, erro: null }));

    api
      .get<T>(caminho)
      .then((dados) => ativo && setEstado({ dados, carregando: false, erro: null }))
      .catch((erro: unknown) => {
        if (!ativo) return;
        const mensagem = erro instanceof ErroApi ? erro.message : 'Falha ao falar com a API';
        setEstado({ dados: null, carregando: false, erro: mensagem });
      });

    return () => {
      ativo = false;
    };
  }, [caminho, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { ...estado, recarregar };
}

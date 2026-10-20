import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type Preferencias = {
  tema: 'dark' | 'light';
  ultimoDocumentoId: number | null;
  ultimaPagina: number | null;
  tamanhoFonteLeitor: number;
  linguagemPadraoIde: string;
};

const PADRAO: Preferencias = {
  tema: 'dark',
  ultimoDocumentoId: null,
  ultimaPagina: null,
  tamanhoFonteLeitor: 1,
  linguagemPadraoIde: 'python',
};

/**
 * Preferencias vivem na API (SQLite), com espelho em localStorage para a
 * tela inicial nao piscar enquanto a requisicao nao volta.
 */
export function usePreferencias() {
  const [prefs, setPrefs] = useState<Preferencias>(() => {
    try {
      const salvo = localStorage.getItem('preferencias');
      return salvo ? { ...PADRAO, ...(JSON.parse(salvo) as Preferencias) } : PADRAO;
    } catch {
      return PADRAO;
    }
  });

  useEffect(() => {
    api
      .get<Preferencias>('/preferencias')
      .then((p) => {
        setPrefs(p);
        localStorage.setItem('preferencias', JSON.stringify(p));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', prefs.tema === 'dark');
    document.documentElement.classList.toggle('light', prefs.tema === 'light');
  }, [prefs.tema]);

  const salvar = useCallback(async (parcial: Partial<Preferencias>) => {
    setPrefs((atual) => {
      const novas = { ...atual, ...parcial };
      localStorage.setItem('preferencias', JSON.stringify(novas));
      void api.put<Preferencias>('/preferencias', novas).catch(() => undefined);
      return novas;
    });
  }, []);

  return { prefs, salvar };
}

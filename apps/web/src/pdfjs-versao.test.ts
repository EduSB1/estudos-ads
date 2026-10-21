import { describe, expect, it } from 'vitest';
import appPkg from '../package.json';
import highlighterPkg from 'react-pdf-highlighter-extended/package.json';
import pdfjsPkg from 'pdfjs-dist/package.json';

/**
 * Guarda contra um erro que ja apareceu duas vezes:
 *
 *   "The API version X does not match the Worker version Y"
 *
 * O react-pdf-highlighter-extended importa `pdfjs-dist` por conta propria.
 * Se o app declarar outra major, o worker que registramos no Leitor nao bate
 * com a API que a biblioteca carrega, e nenhum PDF abre.
 */
describe('versao do pdfjs', () => {
  const major = (v: string) => Number(v.replace(/^[^\d]*/, '').split('.')[0]);

  it('o app declara a mesma major que o highlighter exige', () => {
    const exigida = major(highlighterPkg.dependencies['pdfjs-dist']);
    const declarada = major(appPkg.dependencies['pdfjs-dist']);

    expect(
      declarada,
      `o highlighter pede pdfjs-dist ${highlighterPkg.dependencies['pdfjs-dist']}, ` +
        `mas apps/web declara ${appPkg.dependencies['pdfjs-dist']}`,
    ).toBe(exigida);
  });

  it('a copia instalada e a que o app declarou', () => {
    expect(major(pdfjsPkg.version)).toBe(major(appPkg.dependencies['pdfjs-dist']));
  });
});

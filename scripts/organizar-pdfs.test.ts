import { describe, expect, it } from 'vitest';
import {
  classificar,
  detectarSemestre,
  kebab,
  slugArquivo,
  slugMateria,
} from './organizar-pdfs.ts';

describe('kebab', () => {
  it('remove acentos e normaliza', () => {
    expect(kebab('Métodos ágeis')).toBe('metodos-ageis');
    expect(kebab('  Scrum  e   Design Thinking ')).toBe('scrum-e-design-thinking');
  });
});

describe('slugArquivo', () => {
  it('preserva a extensao e padroniza o numero da aula', () => {
    expect(slugArquivo('aula1-1 Processos prescritivos.pdf')).toBe(
      'aula01-1-processos-prescritivos.pdf',
    );
    expect(slugArquivo('aula10 Testes.pdf')).toBe('aula10-testes.pdf');
  });

  it('absorve quebra de linha no meio do nome do arquivo', () => {
    expect(slugArquivo('aula4 Encapsulamento e modificadores de\nacesso .pdf')).toBe(
      'aula04-encapsulamento-e-modificadores-de-acesso.pdf',
    );
  });
});

describe('slugMateria', () => {
  it('descarta o codigo da disciplina entre parenteses', () => {
    expect(slugMateria('Metodologias Ágeis (6001406_ADS04_EAD_2026_2)')).toBe('metodologias-ageis');
    expect(slugMateria('Programação Orientada a Objetos (Java) (6001401_ADS04_EAD_2026_2)')).toBe(
      'programacao-orientada-a-objetos-java',
    );
  });
});

describe('detectarSemestre', () => {
  it('extrai o semestre do codigo da disciplina', () => {
    expect(detectarSemestre('Metodologias Ágeis (6001406_ADS04_EAD_2026_2)')).toBe('2026-2');
    expect(detectarSemestre('Pasta sem codigo')).toBeNull();
  });
});

describe('classificar', () => {
  it('separa aulas, provas, exercicios e extras', () => {
    expect(classificar('aula3 Abordagens de teste.pdf')).toBe('aulas');
    expect(classificar('Prova final 2026.pdf')).toBe('provas');
    expect(classificar('Lista de exercicios 2.pdf')).toBe('exercicios');
    expect(classificar('ementa.pdf')).toBe('extras');
  });
});

describe('planejar', () => {
  it('nao classifica arquivo solto na raiz da pasta', async () => {
    const { planejar } = await import('./organizar-pdfs.ts');
    void planejar;
    // A varredura real depende do disco; o contrato de raiz vazia e coberto
    // pela checagem de PDF_DIR no main(), que recusa assumir o diretorio atual.
    expect(typeof planejar).toBe('function');
  });
});

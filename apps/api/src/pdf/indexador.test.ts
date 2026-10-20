import { describe, expect, it } from 'vitest';
import { materiaDoCaminho, slugify } from './caminhos.ts';

describe('slugify', () => {
  it('remove acentos e normaliza para kebab-case', () => {
    expect(slugify('Metodologias Ágeis')).toBe('metodologias-ageis');
    expect(slugify('Programação Orientada a Objetos (Java)')).toBe(
      'programacao-orientada-a-objetos-java',
    );
  });
});

describe('materiaDoCaminho', () => {
  it('le o layout de pasta solta da UniOpet, com codigo e semestre', () => {
    const dados = materiaDoCaminho(
      'Metodologias Ágeis (6001406_ADS04_EAD_2026_2)/aula1-1 Processos prescritivos.pdf',
    );

    expect(dados?.nome).toBe('Metodologias Ágeis');
    expect(dados?.slug).toBe('metodologias-ageis');
    expect(dados?.semestre).toBe('2026-2');
    expect(dados?.codigo).toBe('6001406_ADS04_EAD_2026_2');
    expect(dados?.categoria).toBeNull();
  });

  it('le o layout da convencao do organizar-pdfs, com categoria', () => {
    const dados = materiaDoCaminho('2026-2/teste-e-qualidade-de-software/provas/prova01-final.pdf');

    expect(dados?.semestre).toBe('2026-2');
    expect(dados?.slug).toBe('teste-e-qualidade-de-software');
    expect(dados?.categoria).toBe('provas');
  });

  it('recusa arquivo solto na raiz, sem materia', () => {
    expect(materiaDoCaminho('solto.pdf')).toBeNull();
  });
});

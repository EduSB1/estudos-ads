import { expect, test, type APIRequestContext } from '@playwright/test';

const API = 'http://localhost:3333';

type Materia = { id: number; nome: string };
type Documento = { id: number; titulo: string; totalPaginas: number };

async function primeiroDocumento(
  api: APIRequestContext,
): Promise<{ materia: Materia; documento: Documento }> {
  const materias = (await (await api.get(`${API}/materias`)).json()) as Materia[];
  expect(materias.length, 'é preciso ter PDFs indexados: rode `pnpm indexar`').toBeGreaterThan(0);

  const materia = materias[0]!;
  const documentos = (await (
    await api.get(`${API}/materias/${materia.id}/documentos`)
  ).json()) as Documento[];
  expect(documentos.length).toBeGreaterThan(0);

  return { materia, documento: documentos[0]! };
}

test.describe('fluxo de estudo', () => {
  test('abre a tela inicial e lista as matérias indexadas', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Início' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Matérias' })).toBeVisible();
    await expect(page.getByRole('link', { name: /documentos/ }).first()).toBeVisible();
  });

  test('abre um PDF no leitor e guarda a última página lida', async ({ page, request }) => {
    const { documento } = await primeiroDocumento(request);

    await page.goto(`/leitor/${documento.id}`);
    await expect(page.getByRole('navigation', { name: 'Navegação de páginas' })).toBeVisible();

    // Avança uma página e confere que a API registrou a leitura.
    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(page.getByLabel('Número da página')).toHaveValue('2');

    await expect
      .poll(
        async () => {
          const doc = await (await request.get(`${API}/documentos/${documento.id}`)).json();
          return doc.ultimaPagina;
        },
        { timeout: 5_000 },
      )
      .toBe(2);

    // A tela inicial deve oferecer a retomada desse documento.
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Retomar/ })).toBeVisible();
  });

  test('destaque com lembrete aparece na tela de revisão', async ({ page, request }) => {
    const { documento } = await primeiroDocumento(request);

    // Estes PDFs são escaneados (sem camada de texto), então a seleção do leitor
    // não tem o que capturar: criamos o destaque pela API, que é o mesmo caminho.
    const criado = await request.post(`${API}/destaques`, {
      data: {
        documentoId: documento.id,
        pagina: 1,
        cor: 'verde',
        texto: 'Trecho destacado pelo teste end-to-end',
        posicao: { retangulos: [] },
        lembrete: 'Revisar este ponto antes da prova',
      },
    });
    expect(criado.ok()).toBeTruthy();
    const destaque = (await criado.json()) as { id: number };

    try {
      await page.goto('/revisao');
      await expect(page.getByText('Trecho destacado pelo teste end-to-end')).toBeVisible();
      await expect(page.getByText('Revisar este ponto antes da prova')).toBeVisible();

      // Concluir o lembrete deve persistir.
      await page.getByRole('button', { name: 'Concluir' }).first().click();
      await expect(page.getByRole('button', { name: 'Reabrir' }).first()).toBeVisible();
    } finally {
      await request.delete(`${API}/destaques/${destaque.id}`);
    }
  });

  test('responde uma questão e guarda no histórico', async ({ page, request }) => {
    const { materia } = await primeiroDocumento(request);

    const criada = await request.post(`${API}/questoes`, {
      data: {
        materiaId: materia.id,
        enunciado: 'Pergunta criada pelo teste end-to-end: qual alternativa está correta?',
        alternativas: [
          { letra: 'a', texto: 'Primeira alternativa' },
          { letra: 'b', texto: 'Segunda alternativa' },
        ],
        gabarito: 'b',
        origem: 'manual',
      },
    });
    expect(criada.ok()).toBeTruthy();
    const questao = (await criada.json()) as { id: number };

    try {
      await page.goto('/questoes');
      await expect(page.getByText(/teste end-to-end/)).toBeVisible();

      await page.getByRole('button', { name: /Segunda alternativa/ }).click();
      await page.getByRole('button', { name: 'Acertei' }).first().click();

      await page
        .getByRole('button', { name: /Histórico/ })
        .first()
        .click();
      await expect(page.getByText('certa').first()).toBeVisible();
    } finally {
      await request.delete(`${API}/questoes/${questao.id}`);
    }
  });

  test('roda código na mini IDE', async ({ page }) => {
    await page.goto('/ide');
    await expect(page.getByRole('heading', { name: 'Mini IDE' })).toBeVisible();

    // JavaScript roda em Web Worker: não depende de Pyodide nem do Piston.
    await page.getByLabel('Linguagem').selectOption('javascript');

    const editor = page.locator('.monaco-editor').first();
    await expect(editor).toBeVisible({ timeout: 30_000 });
    await editor.click();
    await page.keyboard.press('ControlOrMeta+a');
    // insertText em vez de type(): o Monaco fecha parenteses sozinho e duplicaria o ')'.
    await page.keyboard.insertText('console.log(6 * 7);');

    await page.getByRole('button', { name: 'Executar' }).click();
    await expect(page.getByLabel('Saída da execução')).toContainText('42', { timeout: 20_000 });
  });

  test('navega pelos atalhos de teclado', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Alt+5');
    await expect(page.getByRole('heading', { name: 'Mini IDE' })).toBeVisible();

    await page.keyboard.press('Alt+4');
    await expect(page.getByRole('heading', { name: 'Questões' })).toBeVisible();

    // "/" foca a busca de qualquer tela.
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox')).toBeFocused();
  });
});

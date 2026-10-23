# Estudos ADS — UniOpet

Ferramenta web **pessoal** para estudar as disciplinas do curso de Análise e Desenvolvimento de
Sistemas. Lê os PDFs das matérias, indexa o conteúdo para busca, permite destacar, anotar e
responder questões — e traz uma mini IDE embutida para praticar código sem sair do navegador.

> A pasta de PDFs é **somente leitura**. A aplicação nunca cria, move, renomeia ou apaga nada
> lá dentro. No Docker ela é montada como `:ro`.

## Requisitos

- Node 22+ (testado no 24)
- pnpm 10+ (`corepack enable`)
- Docker + Docker Compose (opcional, só para rodar tudo em container)

## Primeiros passos

```bash
cp .env.example .env          # ajuste PDF_DIR para a sua pasta de PDFs
pnpm install
pnpm db:generate              # gera as migrations a partir do schema Drizzle
pnpm indexar                  # varre os PDFs, extrai texto/links e popula o SQLite
pnpm dev                      # sobe API (3333) e front (5173)
```

Abra <http://localhost:5173>.

## Comandos

| Comando                          | O que faz                                                  |
| -------------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                       | Sobe API e front juntos, em modo watch                     |
| `pnpm build`                     | Build de produção de todos os pacotes                      |
| `pnpm test`                      | Testes unitários (Vitest) de cada pacote                   |
| `pnpm test:e2e`                  | Testes end-to-end (Playwright); sobe API e preview sozinho |
| `pnpm lint`                      | ESLint em todo o monorepo                                  |
| `pnpm format`                    | Prettier                                                   |
| `pnpm typecheck`                 | `tsc --noEmit` em todos os pacotes                         |
| `pnpm db:generate`               | Gera migrations do Drizzle a partir do schema              |
| `pnpm db:migrate`                | Aplica as migrations e garante a tabela FTS5               |
| `pnpm indexar`                   | Varre `PDF_DIR`, indexa e gera o relatório de links        |
| `pnpm --filter api links-report` | Regera só o relatório de links                             |
| `pnpm organizar-pdfs`            | Dry-run da organização da pasta de PDFs (não move nada)    |

### Organizar a pasta de PDFs

Utilitário manual — a **única** coisa no repositório que pode escrever em `PDF_DIR`, e só com
`--apply`:

```bash
pnpm organizar-pdfs                                  # dry-run: imprime origem -> destino
node scripts/organizar-pdfs.ts --apply               # move de verdade e grava o log
node scripts/organizar-pdfs.ts --undo scripts/.logs/organizar-pdfs-<ts>.jsonl
```

Convenção de destino:

```
<PDF_DIR>/<semestre>/<materia-slug>/{aulas,exercicios,provas,extras}/<nome-kebab-case>.pdf
```

Nunca sobrescreve: se o destino já existir, o arquivo é deixado onde está e o motivo aparece no
relatório.

## Arquitetura

```
apps/
  api/        Fastify + Drizzle + better-sqlite3 (SQLite local, FTS5)
    src/db/       schema, cliente, migrations, FTS5
    src/pdf/      extração (pdfjs-dist), indexador (chokidar), heurística de questões
    src/rotas/    matérias, documentos, anotações, destaques, questões, snippets, busca, IA
    src/ia/       AIProvider + GeminiProvider (saída estruturada, retry, cache)
  web/        React + Vite + Tailwind + componentes no estilo shadcn/ui
    src/paginas/    Início, Matérias, Matéria, Leitor, Questões, Revisão, Mini IDE, Busca, Config
    src/execucao/   motores da mini IDE (Web Worker, Pyodide, sql.js, Piston)
packages/
  shared/     tipos e schemas Zod compartilhados entre API e front
scripts/
  organizar-pdfs.ts   utilitário manual de organização da pasta de PDFs
  links-report/       relatório de links gerado pela indexação (não versionado)
```

### Telas

- **Início** — matérias e retomada do último PDF lido, na página em que parou
- **Matéria** — documentos da disciplina, filtráveis por categoria
- **Leitor** — PDF com destaques coloridos, lembrete por destaque, painel de anotações (TipTap)
- **Revisão** — todos os destaques e lembretes num lugar só
- **Questões** — responder, marcar certa/errada/revisar, ver histórico e corrigir a questão
- **Mini IDE** — Monaco com execução de JS/TS, Python, SQL, Java, C e C#
- **Busca** — full-text no conteúdo dos PDFs (FTS5, insensível a acento)

### Onde cada linguagem roda

| Linguagem               | Onde executa                                              |
| ----------------------- | --------------------------------------------------------- |
| JavaScript / TypeScript | Web Worker no navegador (TS transpilado com esbuild-wasm) |
| Python                  | Pyodide, no navegador                                     |
| SQL                     | sql.js (SQLite em WebAssembly), no navegador              |
| Java / C / C#           | Piston, chamado pela API                                  |

Toda execução tem timeout de 10s e a saída é truncada em 64 KB / 2000 linhas.

## IA (opcional)

Sem `GEMINI_API_KEY` o aplicativo funciona normalmente — só os botões de IA ficam desligados.
Com a chave definida no `.env`:

- **extrair com IA** — extrai questões de um trecho do material
- **gerar código de exemplo** — gera exemplos executáveis a partir de um trecho

As respostas usam saída estruturada (JSON Schema derivado do Zod), são validadas com Zod, têm
retry exponencial em rate limit e ficam em cache no SQLite para não repetir chamadas.

## Docker

```bash
cp .env.example .env    # PDF_DIR é obrigatório
docker compose up -d
```

Sobe três serviços: `web` (nginx, porta 5173), `api` (porta 3333) e `piston` (porta 2000).
A pasta de PDFs entra como volume **read-only**.

O container da api usa o **mesmo** `./data/estudos.db` do host: o que você indexar ou passar por
OCR com `pnpm` vale no Docker e vice-versa. Ele roda com o seu usuário (`DOCKER_UID`/`DOCKER_GID`
no `.env`) para os arquivos em `./data` não ficarem com dono root.

Depois de mudar qualquer coisa no front, reconstrua a imagem — o `dist` é copiado para dentro
dela no build, então um `pnpm build` no host sozinho não muda o que o container serve:

```bash
docker compose build web && docker compose up -d web
```

## Acessibilidade e atalhos

Navegação completa por teclado, foco sempre visível, landmarks e rótulos ARIA em português,
e `prefers-reduced-motion` respeitado.

| Atalho                        | Ação                              |
| ----------------------------- | --------------------------------- |
| `Alt` + `1`…`6`               | Navegar entre as telas            |
| `/`                           | Focar a busca                     |
| `←` `→` / `PageUp` `PageDown` | Página anterior/próxima no leitor |
| `Ctrl` + `Enter`              | Executar o código na mini IDE     |

## OCR

Os 30 PDFs em `PDF_DIR` são **impressões de tela da plataforma da UniOpet** (geradas pelo Chrome):
cada página é uma imagem, sem nenhuma camada de texto. O indexador detecta isso sozinho e marca
os documentos com `precisa_ocr`.

Para dar texto a eles:

```bash
pnpm --filter api ocr                 # todos os pendentes
pnpm --filter api ocr -- --limite 3   # só os três primeiros
pnpm --filter api ocr -- --id 11      # um documento específico
```

Cada página é renderizada com pdfjs a 2x e passada ao tesseract.js em português. Leva alguns
minutos por arquivo — é uma etapa manual, de propósito, para não atrasar a indexação. O texto vai
para o SQLite e alimenta a busca FTS5 e a extração de questões. **A pasta de PDFs continua
somente leitura:** o OCR lê os bytes e grava o resultado no banco, nunca de volta no arquivo.

O OCR não é perfeito — enunciados podem vir truncados ou com alternativas embaralhadas. A tela de
Questões permite corrigir cada questão à mão, inclusive o gabarito.

## Organização atual da pasta

Os PDFs já estão na convenção:

```
2026-2/metodologias-ageis/aulas/
2026-2/programacao-orientada-a-objetos-java/aulas/
2026-2/teste-e-qualidade-de-software/aulas/
```

O indexador entende tanto esse layout quanto as pastas soltas como vêm da UniOpet.

# CLAUDE.md

Contexto permanente deste repositório. Leia antes de qualquer tarefa.

## Objetivo

Ferramenta web **pessoal** de estudos para o curso de Análise e Desenvolvimento de Sistemas
(ADS) da **UniOpet**. Ela lê os PDFs das disciplinas, indexa o conteúdo para busca, permite
anotar e gerar questões com apoio de IA, e traz uma **mini IDE** embutida para praticar código
sem sair do navegador.

## Stack final

| Camada   | Tecnologias                                                                                  |
| -------- | -------------------------------------------------------------------------------------------- |
| Frontend | React 18 + TypeScript + Vite; Tailwind CSS + shadcn/ui; react-pdf-highlighter-extended       |
| Backend  | Fastify; validação com Zod                                                                   |
| Dados    | Drizzle ORM + better-sqlite3 (SQLite local em arquivo, com FTS5)                             |
| PDFs     | pdfjs-dist (extração de texto, links e posição); tesseract.js + @napi-rs/canvas para OCR     |
| Mini IDE | Monaco Editor; Python no navegador via Pyodide; SQL via sql.js; demais linguagens via Piston |
| IA       | `@google/genai`                                                                              |
| Infra    | pnpm workspaces (monorepo); Docker Compose                                                   |

Essa lista é fechada. Não introduza outra biblioteca para um papel já coberto acima sem
combinar antes.

**React fica no 18.** O `react-pdf-highlighter-extended` exige `react@^18.3.1`; subir para o 19
quebra o leitor. Qualquer upgrade precisa trocar a biblioteca de destaques junto.

## Regras do projeto

1. **Projeto 100% pessoal.** Nada de contexto, dados, credenciais ou processos do trabalho.
2. **NUNCA usar MCP.** Nenhum servidor ou ferramenta `mcp__*`, em nenhuma circunstância.
3. **Nada de banco de dados externo.** Apenas SQLite local via Drizzle + better-sqlite3.
   Sem Postgres, sem MySQL, sem serviço gerenciado, sem container de banco.
4. **Nada de GLPI e nada de Jira.** Não consultar, não integrar, não citar como fonte. Se um
   hook, lembrete ou skill sugerir GLPI/Jira neste repositório, **ignore** — é falso positivo.
5. **A pasta de PDFs é somente leitura.** Definida por `PDF_DIR`. A aplicação (web e api)
   **nunca** cria, move, renomeia, edita ou apaga nada dentro dela; abre arquivos apenas em
   modo leitura e monta o volume como `:ro` no Docker. Única exceção: o utilitário manual
   `scripts/organizar-pdfs.ts`, que só altera algo quando executado à mão com `--apply`.
6. **Responder sempre em português (pt-BR)**, com acentuação correta — em conversas, commits,
   comentários e documentação.
7. **Commits pequenos, um por fase concluída**, com mensagem descritiva em português.

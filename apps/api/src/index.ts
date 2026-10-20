import { sqlite } from './db/cliente.ts';
import { migrarBanco } from './db/migrar.ts';
import { env } from './env.ts';
import { observarPdfs, varrerTudo } from './pdf/indexador.ts';
import { criarServidor } from './servidor.ts';

migrarBanco();

const app = await criarServidor();

await app.listen({ port: env.API_PORT, host: env.API_HOST });
app.log.info(`PDFs (somente leitura): ${env.pdfDir}`);
app.log.info(`Banco SQLite: ${env.dbPath}`);
app.log.info(`IA: ${env.temIa ? env.GEMINI_MODEL : 'desligada (sem GEMINI_API_KEY)'}`);

// Indexa em segundo plano para nao atrasar o boot da API.
void varrerTudo().then((resultados) => {
  const indexados = resultados.filter((r) => r.acao === 'indexado').length;
  const ocr = resultados.filter((r) => r.precisaOcr).length;
  app.log.info(`Indexacao inicial: ${indexados} novos/atualizados, ${ocr} para OCR.`);
});

const observador = observarPdfs((r) => {
  if (r.acao === 'indexado') app.log.info(`Reindexado: ${r.arquivo}`);
  if (r.acao === 'erro') app.log.warn(`Falha ao indexar ${r.arquivo}: ${r.erro}`);
});

for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sinal, () => {
    void observador.close();
    void app.close().then(() => {
      sqlite.close();
      process.exit(0);
    });
  });
}

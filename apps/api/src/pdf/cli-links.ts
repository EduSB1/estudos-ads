import { sqlite } from '../db/cliente.ts';
import { gravarRelatorio } from './relatorio-links.ts';

const { json, md, relatorio } = gravarRelatorio();
console.log(`${relatorio.totalLinks} links em ${relatorio.totalDocumentos} documentos.`);
console.log(`${relatorio.escaneados.length} PDFs marcados para OCR.`);
console.log(`Gerado: ${md}`);
console.log(`Gerado: ${json}`);
console.log('Nenhum link foi acessado.');
sqlite.close();

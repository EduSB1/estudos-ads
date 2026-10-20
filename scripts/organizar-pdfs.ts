/**
 * Organiza a pasta de PDFs do curso na convencao:
 *
 *   <raiz>/<semestre>/<materia-slug>/{aulas,exercicios,provas,extras}/<nome-kebab-case>.pdf
 *
 * Garantias:
 *   - Roda em --dry-run por padrao: nada e tocado sem --apply.
 *   - Nunca sobrescreve: o move so acontece se o destino nao existir (checagem atomica).
 *   - Grava um log JSONL por execucao com --apply, para desfazer com --undo <log>.
 *
 * Uso:
 *   node scripts/organizar-pdfs.ts                      # dry-run (padrao)
 *   node scripts/organizar-pdfs.ts --apply              # move de verdade
 *   node scripts/organizar-pdfs.ts --undo scripts/.logs/organizar-pdfs-<ts>.jsonl
 *   node scripts/organizar-pdfs.ts --raiz /outro/caminho --semestre 2026-2
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** Subpastas da convencao, na ordem em que aparecem no relatorio. */
export const CATEGORIAS = ['aulas', 'exercicios', 'provas', 'extras'] as const;
type Categoria = (typeof CATEGORIAS)[number];

type Acao =
  | { tipo: 'mover'; origem: string; destino: string; categoria: Categoria }
  | { tipo: 'ok'; origem: string; motivo: string }
  | { tipo: 'pular'; origem: string; motivo: string };

type EntradaLog = { origem: string; destino: string };

// ---------------------------------------------------------------- utilidades

/** Remove acentos, baixa a caixa e converte para kebab-case. Preserva a extensao. */
export function kebab(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2010-\u2015]/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Normaliza o nome do arquivo mantendo a extensao e padronizando "aulaN" -> "aulaNN". */
export function slugArquivo(nome: string): string {
  const ext = path.extname(nome).toLowerCase();
  const base = ext ? nome.slice(0, -ext.length) : nome;
  const slug = kebab(base).replace(/^aula-?(\d+)/, (_m, n: string) => `aula${n.padStart(2, '0')}`);
  return `${slug}${ext}`;
}

/** Deriva o slug da materia removendo o codigo da disciplina entre parenteses no fim. */
export function slugMateria(nomePasta: string): string {
  return kebab(nomePasta.replace(/\s*\(\s*\d{6,}_[^)]*\)\s*$/i, ''));
}

/** Extrai "2026-2" de "Metodologias Ageis (6001406_ADS04_EAD_2026_2)". */
export function detectarSemestre(nomePasta: string): string | null {
  const m = nomePasta.match(/(20\d{2})[_-]([1-4])\b/);
  return m ? `${m[1]}-${m[2]}` : null;
}

/** Classifica o arquivo numa das quatro subpastas pelo nome. */
export function classificar(nome: string): Categoria {
  const n = kebab(nome);
  if (/(^|-)(prova|avaliacao|simulado|exame|nota)(-|$)/.test(n)) return 'provas';
  if (/(^|-)(exercicio|exercicios|lista|atividade|pratica|questoes)(-|$)/.test(n))
    return 'exercicios';
  if (/^aula\d/.test(n) || /(^|-)(aula|unidade|modulo|slide|slides)(-|$)/.test(n)) return 'aulas';
  return 'extras';
}

function listarArquivos(dir: string, base = dir): string[] {
  const saida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, entrada.name);
    if (entrada.isDirectory()) saida.push(...listarArquivos(completo, base));
    else if (entrada.isFile()) saida.push(path.relative(base, completo));
  }
  return saida.sort();
}

/** Nome legivel para o terminal: quebras de linha viram o simbolo visivel. */
function visivel(p: string): string {
  return p.replace(/\n/g, '⏎');
}

// ------------------------------------------------------------------- analise

export function planejar(raiz: string, semestrePadrao: string | null): Acao[] {
  const acoes: Acao[] = [];
  const destinosUsados = new Map<string, string>();
  const jaOrganizado = /^20\d{2}-[1-4]\//;

  for (const rel of listarArquivos(raiz)) {
    const partes = rel.split(path.sep);
    const nome = partes[partes.length - 1]!;

    if (nome.startsWith('.')) {
      acoes.push({ tipo: 'pular', origem: rel, motivo: 'arquivo oculto' });
      continue;
    }
    if (jaOrganizado.test(rel.split(path.sep).join('/'))) {
      acoes.push({ tipo: 'ok', origem: rel, motivo: 'ja esta na convencao' });
      continue;
    }
    if (partes.length < 2) {
      acoes.push({
        tipo: 'pular',
        origem: rel,
        motivo: 'esta na raiz, sem materia identificavel',
      });
      continue;
    }

    const pastaMateria = partes[0]!;
    const semestre = detectarSemestre(pastaMateria) ?? semestrePadrao;
    if (!semestre) {
      acoes.push({
        tipo: 'pular',
        origem: rel,
        motivo: `semestre nao detectado em "${pastaMateria}" (use --semestre)`,
      });
      continue;
    }

    const materia = slugMateria(pastaMateria);
    if (!materia) {
      acoes.push({ tipo: 'pular', origem: rel, motivo: 'slug de materia vazio' });
      continue;
    }

    const categoria = classificar(nome);
    const destinoRel = path.join(semestre, materia, categoria, slugArquivo(nome));

    if (destinoRel === rel) {
      acoes.push({ tipo: 'ok', origem: rel, motivo: 'ja esta no lugar certo' });
      continue;
    }
    const anterior = destinosUsados.get(destinoRel);
    if (anterior) {
      acoes.push({
        tipo: 'pular',
        origem: rel,
        motivo: `colidiria com "${visivel(anterior)}" no mesmo destino`,
      });
      continue;
    }
    if (fs.existsSync(path.join(raiz, destinoRel))) {
      acoes.push({ tipo: 'pular', origem: rel, motivo: 'destino ja existe em disco' });
      continue;
    }

    destinosUsados.set(destinoRel, rel);
    acoes.push({ tipo: 'mover', origem: rel, destino: destinoRel, categoria });
  }

  return acoes;
}

// ------------------------------------------------------------------ execucao

/** Move sem jamais sobrescrever: link+unlink e atomico; cai para copia exclusiva entre discos. */
function moverSeguro(origem: string, destino: string): void {
  try {
    fs.linkSync(origem, destino);
    fs.unlinkSync(origem);
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code;
    if (codigo === 'EEXIST') throw new Error(`destino ja existe: ${destino}`);
    if (codigo !== 'EXDEV' && codigo !== 'EPERM' && codigo !== 'ENOSYS') throw erro;
    fs.copyFileSync(origem, destino, fs.constants.COPYFILE_EXCL);
    fs.unlinkSync(origem);
  }
}

function aplicar(raiz: string, acoes: Acao[]): string {
  const mover = acoes.filter((a): a is Extract<Acao, { tipo: 'mover' }> => a.tipo === 'mover');
  const dirLogs = path.join(process.cwd(), 'scripts', '.logs');
  fs.mkdirSync(dirLogs, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const caminhoLog = path.join(dirLogs, `organizar-pdfs-${carimbo}.jsonl`);
  const log = fs.openSync(caminhoLog, 'a');

  fs.writeSync(log, JSON.stringify({ raiz, criadoEm: carimbo, total: mover.length }) + '\n');

  let movidos = 0;
  for (const acao of mover) {
    const origem = path.join(raiz, acao.origem);
    const destino = path.join(raiz, acao.destino);
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    try {
      moverSeguro(origem, destino);
      const entrada: EntradaLog = { origem: acao.origem, destino: acao.destino };
      fs.writeSync(log, JSON.stringify(entrada) + '\n');
      movidos++;
      console.log(`  movido  ${visivel(acao.origem)}`);
    } catch (erro) {
      console.error(`  FALHOU  ${visivel(acao.origem)}: ${(erro as Error).message}`);
    }
  }
  fs.closeSync(log);
  console.log(`\n${movidos}/${mover.length} arquivos movidos.`);
  console.log(`Log para desfazer: ${path.relative(process.cwd(), caminhoLog)}`);
  return caminhoLog;
}

function desfazer(caminhoLog: string): void {
  const linhas = fs.readFileSync(caminhoLog, 'utf8').trim().split('\n');
  const cabecalho = JSON.parse(linhas[0]!) as { raiz: string };
  const entradas = linhas.slice(1).map((l) => JSON.parse(l) as EntradaLog);

  let revertidos = 0;
  for (const entrada of entradas.reverse()) {
    const de = path.join(cabecalho.raiz, entrada.destino);
    const para = path.join(cabecalho.raiz, entrada.origem);
    if (!fs.existsSync(de)) {
      console.error(`  ausente ${visivel(entrada.destino)}`);
      continue;
    }
    if (fs.existsSync(para)) {
      console.error(`  ocupado ${visivel(entrada.origem)} (nao sobrescrito)`);
      continue;
    }
    fs.mkdirSync(path.dirname(para), { recursive: true });
    moverSeguro(de, para);
    revertidos++;
  }
  console.log(`\n${revertidos}/${entradas.length} arquivos revertidos.`);
}

// --------------------------------------------------------------------- saida

function relatorio(raiz: string, acoes: Acao[], aplicando: boolean): void {
  const mover = acoes.filter((a) => a.tipo === 'mover');
  const pular = acoes.filter((a) => a.tipo === 'pular');
  const ok = acoes.filter((a) => a.tipo === 'ok');

  console.log(`\nRaiz: ${raiz}`);
  console.log(`Modo: ${aplicando ? 'APLICAR (move arquivos)' : 'DRY-RUN (nada sera alterado)'}\n`);

  const porMateria = new Map<string, Extract<Acao, { tipo: 'mover' }>[]>();
  for (const acao of mover) {
    if (acao.tipo !== 'mover') continue;
    const chave = path.dirname(path.dirname(acao.destino));
    const lista = porMateria.get(chave) ?? [];
    lista.push(acao);
    porMateria.set(chave, lista);
  }

  for (const [materia, lista] of [...porMateria].sort()) {
    console.log(`\x1b[1m${materia}\x1b[0m  (${lista.length})`);
    for (const a of lista) {
      console.log(`  ${visivel(a.origem)}`);
      console.log(`    -> ${visivel(a.destino)}`);
    }
    console.log('');
  }

  if (pular.length) {
    console.log('\x1b[1mNAO SERAO TOCADOS\x1b[0m');
    for (const a of pular) {
      if (a.tipo !== 'pular') continue;
      console.log(`  ${visivel(a.origem)}`);
      console.log(`    motivo: ${a.motivo}`);
    }
    console.log('');
  }

  console.log(`Resumo: ${mover.length} a mover, ${pular.length} ignorados, ${ok.length} ja ok.`);
  if (!aplicando && mover.length) {
    console.log('Para aplicar: node scripts/organizar-pdfs.ts --apply');
  }
}

// ---------------------------------------------------------------------- main

function main(): void {
  const argv = process.argv.slice(2);
  const valor = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1]! : null;
  };

  const logUndo = valor('--undo');
  if (logUndo) {
    desfazer(path.resolve(logUndo));
    return;
  }

  const raiz = path.resolve(valor('--raiz') ?? process.env.PDF_DIR ?? '');
  if (!raiz || !fs.existsSync(raiz)) {
    console.error('Defina a pasta dos PDFs em PDF_DIR ou passe --raiz <caminho>.');
    process.exitCode = 1;
    return;
  }

  const aplicando = argv.includes('--apply');
  const acoes = planejar(raiz, valor('--semestre'));
  relatorio(raiz, acoes, aplicando);
  if (aplicando) aplicar(raiz, acoes);
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}

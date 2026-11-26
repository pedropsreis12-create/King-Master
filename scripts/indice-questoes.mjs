// Monta o índice do banco de questões (dados/questoes/<disciplina>.json).
// O índice guarda só os metadados de cada questão (fonte, referência, subtema, dificuldade, prova, ano e imagem);
// o texto é baixado pelo site, na hora, das fontes abertas:
//   0 = ENEM (api.enem.dev), 1 = vestibulares de História e Geografia (CEIA-POSITIVO/vestibular-gen_qa),
//   2 = FUVEST e UNICAMP (portuguese-benchmark-datasets/BLUEX).
// Uso: node scripts/indice-questoes.mjs [pasta-de-cache]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(path.join(RAIZ, 'questoes-assuntos.js')).href);
const A = globalThis.KingQuestoesAssuntos;
const CACHE = process.argv[2] || path.join(RAIZ, '.cache-questoes');
fs.mkdirSync(CACHE, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));

async function json(url, tentativas = 6) {
    for (let tentativa = 0; tentativa < tentativas; tentativa++) {
        try {
            const r = await fetch(url);
            if (r.ok) return await r.json();
            if (r.status === 400 || r.status === 404) return null;
        } catch { /* tenta de novo */ }
        await espera(2500 * (tentativa + 1));
    }
    throw new Error(`falhou: ${url}`);
}
// Páginas do Hugging Face que falham são divididas em partes menores; linhas que sempre falham ficam de fora.
async function linhasHF(base, offset, tamanho) {
    try { return (await json(`${base}&offset=${offset}&length=${tamanho}`, tamanho > 1 ? 3 : 4))?.rows || []; }
    catch {
        if (tamanho === 1) { console.warn('pulando linha', offset); return []; }
        const parte = Math.max(1, Math.ceil(tamanho / 5));
        const linhas = [];
        for (let o = offset; o < offset + tamanho; o += parte) linhas.push(...await linhasHF(base, o, Math.min(parte, offset + tamanho - o)));
        return linhas;
    }
}
async function emCache(nome, gerar) {
    const arquivo = path.join(CACHE, nome);
    if (fs.existsSync(arquivo)) return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    const valor = await gerar();
    fs.writeFileSync(arquivo, JSON.stringify(valor));
    return valor;
}

const indice = {}; // disc -> { provas: [], q: [] }
function guardar(disc, fonte, ref, sub, dif, prova, ano, img) {
    if (!A.DISCIPLINAS[disc]) return;
    const d = indice[disc] ||= { provas: [], q: [] };
    let p = d.provas.indexOf(prova);
    if (p < 0) { d.provas.push(prova); p = d.provas.length - 1; }
    d.q.push([fonte, ref, sub, dif, p, ano, img ? 1 : 0]);
}
const DIF = { 'Fácil': 1, 'Médio': 2, 'Difícil': 3 };

// ----- ENEM -----
const AREA_API = { linguagens: 'linguagens', 'ciencias-humanas': 'humanas', 'ciencias-natureza': 'natureza', matematica: 'matematica' };
const PADRAO = { linguagens: 'portugues', humanas: 'historia', natureza: 'biologia', matematica: 'matematica' };
const exames = await json('https://api.enem.dev/v1/exams');
let totalEnem = 0;
for (const exame of exames) {
    const ano = exame.year;
    const linguas = (exame.languages || []).map(l => l.value);
    const questoes = await emCache(`enem-${ano}.json`, async () => {
        const todas = new Map();
        for (const lingua of linguas.length ? linguas : ['']) {
            for (let offset = 0; offset < 200; offset += 50) {
                const corpo = await json(`https://api.enem.dev/v1/exams/${ano}/questions?limit=50&offset=${offset}${lingua ? `&language=${lingua}` : ''}`);
                for (const q of corpo?.questions || []) todas.set(`${q.index}-${q.language || ''}`, {
                    index: q.index, language: q.language, discipline: q.discipline,
                    texto: `${q.context || ''} ${q.alternativesIntroduction || ''} ${(q.alternatives || []).map(a => a.text || '').join(' ')}`,
                    img: /!\[/.test(q.context || '') || (q.files || []).length > 0 || (q.alternatives || []).some(a => a.file),
                });
                await espera(150);
            }
        }
        return [...todas.values()];
    });
    for (const q of questoes) {
        const area = AREA_API[q.discipline];
        if (!area) continue;
        let disc;
        if (area === 'linguagens' && q.language) disc = q.language === 'ingles' ? 'ingles' : 'espanhol';
        else {
            const r = A.disciplina(q.texto, A.discDaArea(area).filter(d => !['ingles', 'espanhol'].includes(d)));
            disc = r.pontos >= 2 ? r.disc : (area === 'linguagens' || area === 'matematica' ? PADRAO[area] : r.disc || PADRAO[area]);
        }
        guardar(disc, 0, `${ano}-${q.index}${q.language ? `-${q.language}` : ''}`, A.subtema(disc, q.texto), 0, 'ENEM', ano, q.img);
        totalEnem++;
    }
    console.log('ENEM', ano, questoes.length);
}

// ----- Vestibulares de História e Geografia (CEIA-POSITIVO) -----
const VEST = 'https://datasets-server.huggingface.co/rows?dataset=CEIA-POSITIVO/vestibular-gen_qa&config=default&split=train';
const vest = await emCache('vestibular.json', async () => {
    const linhas = [];
    for (let offset = 0; offset < 15717; offset += 100) {
        for (const { row_idx, row } of await linhasHF(VEST, offset, 100)) {
            const o = row.original_question || {};
            const alt = o.alternatives || {};
            const q = String(o.question || '');
            linhas.push({ i: row_idx, s: o.subject, t: o.tags, d: o.dificuldade, p: o.titulo, n: ['A', 'B', 'C', 'D', 'E'].filter(k => alt[k]).length,
                img: /<img|https?:\/\/\S+\.(png|jpe?g|gif)/i.test(q), fig: /\b(figura|imagem|charge|tirinha|mapa)\b/i.test(q), texto: q.slice(0, 600) });
        }
        if (offset % 2000 === 0) console.log('vestibulares', offset);
    }
    return linhas;
});
const MATERIA_VEST = { 'História': 'historia', 'Geografia': 'geografia' };
// Instituição a partir do título da prova ("UECE 2° Fase 2° Dia 2012 - Questão" -> "UECE").
function instituicao(titulo) {
    const t = String(titulo || '').replace(/\s*-\s*Quest[aã]o.*$/i, '').replace(/\s*\([^)]*\)/g, ' ').replace(/\s{3,}/g, '  ').trim();
    return t.split(/\s{2,}|\s(?=\d)|\s(?=(?:Medicina|Caderno|Tipo|Economia|Inverno|Ver[aã]o|Vestibular|Superior|Tarde|Manh[aã]|Noite|Conhecimentos|PAES|PAS|PSV|SSA|Direito|Administra|Hist[oó]ria|Geografia|Demais|Odontologia|Engenharia|Prova|Segundo|Primeiro|Fase|Dia|Grupo|Etapa|Seriado|Agendado)\b)/)[0].trim() || t;
}
let totalVest = 0;
for (const v of vest) {
    const disc = MATERIA_VEST[v.s];
    if (!disc || v.n < 4 || (v.fig && !v.img)) continue;
    const prova = instituicao(v.p) || 'Vestibular';
    const ano = Number((String(v.p).match(/(?:19|20)\d\d/) || [0])[0]);
    // O ENEM 2009–2023 já vem completo do enem.dev; daqui ficam só as provas que faltam lá (PPL e anos anteriores).
    if (prova === 'ENEM' && ano >= 2009) continue;
    let tags = [];
    try { tags = JSON.parse(String(v.t || '[]').replace(/'/g, '"')); } catch { tags = [String(v.t || '')]; }
    const sub = A.subtema(disc, tags.join(' ; ')) || A.subtema(disc, v.texto || '', 2);
    guardar(disc, 1, v.i, sub, DIF[v.d] || 0, prova, ano, v.img);
    totalVest++;
}
console.log('vestibulares', totalVest);

// ----- FUVEST e UNICAMP (BLUEX) -----
const BLUEX = 'https://datasets-server.huggingface.co/rows?dataset=portuguese-benchmark-datasets/BLUEX&config=default&split=questions';
const bluex = await emCache('bluex.json', async () => {
    const linhas = [];
    for (let offset = 0; offset < 1422; offset += 50) {
        for (const { row_idx, row } of await linhasHF(BLUEX, offset, 50)) linhas.push({ i: row_idx, id: row.id, s: row.subject, tipo: row.alternatives_type, img: row.has_associated_images,
            n: (row.alternatives || []).length, texto: `${row.question || ''} ${(row.alternatives || []).join(' ')}`.slice(0, 3000) });
        console.log('bluex', offset);
    }
    return linhas;
});
const MATERIA_BLUEX = { biology: ['biologia'], chemistry: ['quimica'], physics: ['fisica'], history: ['historia'], geography: ['geografia'], philosophy: ['filosofia'], sociology: ['sociologia'], english: ['ingles'],
    mathematics: ['matematica', 'geometria', 'estatistica'], portuguese: ['portugues', 'literatura'] };
let totalBluex = 0;
for (const b of bluex) {
    const opcoes = MATERIA_BLUEX[b.s?.[0]];
    if (!opcoes || b.tipo !== 'string' || b.n < 4) continue;
    const disc = opcoes.length === 1 ? opcoes[0] : (A.disciplina(b.texto, opcoes).pontos >= 2 ? A.disciplina(b.texto, opcoes).disc : opcoes[0]);
    const [inst, ano] = String(b.id).split('_');
    guardar(disc, 2, b.i, A.subtema(disc, b.texto), 0, inst === 'USP' ? 'FUVEST' : inst, Number(ano), b.img);
    totalBluex++;
}
console.log('bluex', totalBluex);

// ----- Grava -----
const SAIDA = path.join(RAIZ, 'dados', 'questoes');
fs.mkdirSync(SAIDA, { recursive: true });
const resumo = {};
for (const [disc, d] of Object.entries(indice)) {
    d.q.sort((a, b) => a[5] - b[5] || a[0] - b[0] || String(a[1]).localeCompare(String(b[1]), 'pt', { numeric: true }));
    fs.writeFileSync(path.join(SAIDA, `${disc}.json`), JSON.stringify({ v: 1, provas: d.provas, q: d.q }));
    resumo[disc] = d.q.length;
}
fs.writeFileSync(path.join(SAIDA, 'resumo.json'), JSON.stringify({ v: 1, geradoEm: new Date().toISOString().slice(0, 10), total: resumo }));
console.log('resumo', resumo, 'ENEM', totalEnem);

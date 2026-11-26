/* Banco de questões da aba Questões.
   Fontes (o índice com os metadados fica em dados/questoes/<disciplina>.json; o texto vem na hora, das fontes abertas):
   - ENEM 2009–2023 (api.enem.dev), com gabarito oficial;
   - vestibulares e concursos militares de História e Geografia (acervo CEIA-POSITIVO/vestibular-gen_qa, Hugging Face);
   - FUVEST e UNICAMP 2018–2025 de todas as matérias (acervo BLUEX, Hugging Face);
   - questões criadas pela IA no estilo de cada prova, guardadas na conta.
   O aluno escolhe as matérias, filtra por tema e subtema e responde direto em cada cartão. */
(() => {
    'use strict';
    const A = window.KingQuestoesAssuntos;
    const DISC = A.DISCIPLINAS;
    const ENEM_API = 'https://api.enem.dev/v1';
    const HF = 'https://datasets-server.huggingface.co/rows';
    const VERSAO_INDICE = '20261126-1';
    const AREAS = { linguagens: 'Linguagens', humanas: 'Humanas', natureza: 'Natureza', matematica: 'Matemática' };
    const BANCAS_IA = ['ENEM', 'FUVEST', 'UNICAMP', 'UNESP', 'UERJ'];
    const NIVEIS_IA = { basico: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    const DIFICULDADES = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' };
    const MILITARES = new Set(['EsPCEx', 'ESA', 'EFOMM', 'AFA', 'EEAR', 'EN', 'Escola Naval', 'IME', 'ITA', 'CN', 'Colégio Naval', 'EPCAR', 'EsSA', 'ESPCEX']);
    const ORIGENS = { enem: 'ENEM', vest: 'Vestibulares', militar: 'Concursos militares', ia: 'Criadas pela IA' };
    const LETRAS = 'ABCDE';
    const POR_PAGINA = 10;
    const MAX_GERADAS = 80;
    const ICONE_DISC = { ingles: 'idiomas', espanhol: 'idiomas' };

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const urlImagem = u => /^https:\/\/enem\.dev\/[^\s"'<>)]+$/.test(String(u || '')) && !/broken-image/.test(u) ? String(u) : '';
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (m, e) => window.showToast?.(m, e);
    const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
    const dataCurta = ms => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const numero = n => Number(n).toLocaleString('pt-BR');

    // ----- Texto das questões -----
    // Markdown simples das questões do ENEM: negrito, itálico, imagens e parágrafos (sempre escapado).
    function markdown(texto) {
        return String(texto || '').split(/\n{2,}/).map(bloco => {
            let p = esc(bloco.trim());
            if (!p) return '';
            p = p.replace(/!\[[^\]]*\]\(([^)\s]+)\)/g, (_, u) => { const url = urlImagem(u.replace(/&amp;/g, '&')); return url ? `<img src="${esc(url)}" alt="Imagem da questão" loading="lazy">` : ''; });
            p = p.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
            p = p.replace(/ {2,}\n/g, ' ').replace(/\n/g, ' ');
            return p.startsWith('<img') && !/<img[^>]*>.+/.test(p) ? p : `<p>${p}</p>`;
        }).join('');
    }
    // Texto simples (vestibulares e IA): junta linhas quebradas no meio da frase e separa os parágrafos.
    function textoPlano(texto) {
        const linhas = String(texto || '').replace(/\r/g, '').split('\n').map(l => l.replace(/\s+/g, ' ').trim());
        const paragrafos = [];
        let atual = '';
        for (const l of linhas) {
            if (!l) { if (atual) paragrafos.push(atual); atual = ''; continue; }
            const novoItem = /^(\d{1,2}\)|[IVX]{1,4}[.)–-]\s|[a-e]\)\s|[-•]\s|\[\d+\])/.test(l);
            if (atual && (novoItem || /[.:;?!»”"]$/.test(atual))) { paragrafos.push(atual); atual = l; }
            else atual = atual ? `${atual} ${l}` : l;
        }
        if (atual) paragrafos.push(atual);
        return paragrafos.map(p => `<p>${esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`).join('');
    }
    // Texto da IA em parágrafos e listas, sempre escapado.
    function textoIa(texto) {
        const linhas = String(texto || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
        let html = '', lista = false;
        for (const l of linhas) {
            const item = /^[-•*]\s+/.test(l);
            if (item && !lista) { html += '<ul>'; lista = true; }
            if (!item && lista) { html += '</ul>'; lista = false; }
            const t = esc(l.replace(/^[-•*]\s+/, '')).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            html += item ? `<li>${t}</li>` : `<p>${t}</p>`;
        }
        return html + (lista ? '</ul>' : '');
    }

    // ----- Conversão de cada fonte para o formato do cartão -----
    function normalizarEnem(q) {
        const alternativas = (Array.isArray(q?.alternatives) ? q.alternatives : []).map(a => ({ letra: String(a.letter || ''), texto: String(a.text || ''), imagem: urlImagem(a.file) }));
        const correta = LETRAS.indexOf(String(q?.correctAlternative || '').toUpperCase());
        if (alternativas.length !== 5 || correta < 0) return null;
        const contexto = String(q.context || '');
        const arquivos = (Array.isArray(q.files) ? q.files : []).map(urlImagem).filter(u => u && !contexto.includes(u));
        return { formato: 'markdown', rotulo: `ENEM ${q.year} · questão ${q.index}`, contexto, introducao: String(q.alternativesIntroduction || ''), alternativas, correta, imagens: arquivos,
            temImagem: /!\[/.test(contexto) || arquivos.length > 0 || alternativas.some(a => a.imagem) };
    }
    function normalizarVestibular(o) {
        const alt = o?.alternatives || {};
        let letras = LETRAS.split('').filter(k => String(alt[k] || '').trim());
        // O acervo completa as questões de 4 alternativas com um "E) Nenhuma das anteriores" artificial.
        if (letras.length === 5 && alt.E === 'Nenhuma das anteriores' && o.answer !== 'E') letras = letras.slice(0, 4);
        const correta = letras.indexOf(String(o?.answer || '').toUpperCase());
        if (letras.length < 4 || correta < 0) return null;
        return { formato: 'texto', rotulo: String(o.titulo || '').replace(/\s*-\s*Quest[aã]o\s*$/i, '').replace(/\s{2,}/g, ' ').trim(), contexto: String(o.question || ''), introducao: '',
            alternativas: letras.map((k, i) => ({ letra: LETRAS[i], texto: String(alt[k]), imagem: '' })), correta, imagens: [], temImagem: false };
    }
    function normalizarBluex(r) {
        const alternativas = (Array.isArray(r?.alternatives) ? r.alternatives : []).map((t, i) => ({ letra: LETRAS[i], texto: String(t).replace(/^\s*[a-eA-E]\)\s*/, ''), imagem: '' }));
        const correta = LETRAS.indexOf(String(r?.answer || '').toUpperCase());
        if (alternativas.length < 4 || correta < 0) return null;
        const imagens = (Array.isArray(r.associated_images) ? r.associated_images : []).filter(b => /^[A-Za-z0-9+/=\s]+$/.test(String(b).slice(0, 200)) && String(b).length < 3e6).map(b => { const dados64 = String(b).replace(/\s+/g, ''); return `data:image/${dados64.startsWith('/9j/') ? 'jpeg' : 'png'};base64,${dados64}`; });
        const [inst, ano] = String(r.id || '').split('_');
        return { formato: 'texto', rotulo: `${inst === 'USP' ? 'FUVEST' : inst} ${ano}`, contexto: String(r.question || ''), introducao: '', alternativas, correta, imagens, temImagem: imagens.length > 0 };
    }

    // ----- Índice -----
    const indices = new Map(); // disc -> entradas
    let resumo = null;
    async function carregarResumo() {
        if (resumo) return resumo;
        try { resumo = (await (await fetch(`dados/questoes/resumo.json?v=${VERSAO_INDICE}`)).json()).total || {}; } catch { resumo = {}; }
        return resumo;
    }
    async function carregarIndice(disc) {
        if (indices.has(disc)) return indices.get(disc);
        const resposta = await fetch(`dados/questoes/${disc}.json?v=${VERSAO_INDICE}`);
        if (!resposta.ok) throw new Error('Não foi possível carregar o índice de questões. Verifique a internet e tente de novo.');
        const { provas, q } = await resposta.json();
        const lista = q.map(([fonte, ref, sub, dif, p, ano, img]) => ({
            id: fonte === 0 ? `enem-${ref}` : fonte === 1 ? `vest-${ref}` : `bluex-${ref}`, fonte: ['enem', 'vest', 'bluex'][fonte], ref, disc, sub: sub || '', dif, prova: provas[p], ano, img: !!img,
        }));
        indices.set(disc, lista);
        return lista;
    }
    const origemDe = e => e.fonte === 'ia' ? 'ia' : /^ENEM\b/.test(e.prova) ? 'enem' : MILITARES.has(e.prova) ? 'militar' : 'vest';
    const temaDe = e => String(e.sub || '').split('.')[0];

    // Questões criadas pela IA viram entradas do mesmo jeito que as do índice.
    function entradasIa(discs) {
        return banco().geradas.filter(q => (q.discs || [q.disc]).some(d => discs.includes(d))).map(q => ({
            id: q.id, fonte: 'ia', disc: (q.discs || [q.disc]).find(d => discs.includes(d)), sub: q.sub || '', dif: { basico: 1, medio: 2, dificil: 3 }[q.nivel] || 0, prova: `IA · estilo ${q.banca}`, ano: new Date(q.em || Date.now()).getFullYear(), img: !!q.imagem, em: q.em,
        }));
    }

    // Aplica os filtros às entradas. b = { respondidas, salvas }.
    function filtrar(entradas, f, b = {}) {
        const respondidas = b.respondidas || {}, salvas = b.salvas || {};
        const ids = new Set(f.ids || []);
        const temas = new Set(f.temas || []), subs = new Set(f.subs || []);
        const origens = new Set(f.origens || []);
        const discsComAssunto = new Set([...temas, ...subs].map(x => x.split('.')[0]));
        const lista = entradas.filter(e => {
            if (ids.size) return ids.has(e.id);
            if (f.discs?.length && !f.discs.includes(e.disc)) return false;
            if (discsComAssunto.has(e.disc)) {
                const tema = `${e.disc}.${temaDe(e)}`;
                if (!temas.has(tema) && !subs.has(`${e.disc}.${e.sub}`)) return false;
            }
            if (origens.size && !origens.has(origemDe(e))) return false;
            if (f.prova && e.prova !== f.prova) return false;
            if (f.anoDe && e.ano < Number(f.anoDe)) return false;
            if (f.anoAte && e.ano > Number(f.anoAte)) return false;
            if (f.dif && String(e.dif) !== String(f.dif)) return false;
            if (f.imagem === 'com' && !e.img) return false;
            if (f.imagem === 'sem' && e.img) return false;
            const r = respondidas[e.id];
            if (f.situacao === 'nao' && r) return false;
            if (f.situacao === 'acertei' && !r?.ok) return false;
            if (f.situacao === 'errei' && (!r || r.ok)) return false;
            if (f.situacao === 'salvas' && !salvas[e.id]) return false;
            return true;
        });
        if (f.ordem === 'aleatoria') return lista.sort((a, c) => hash(a.id + f.semente) - hash(c.id + f.semente));
        // Sem ano conhecido vai para o fim, nas duas ordens.
        const recentes = f.ordem === 'recentes';
        const anoDe = e => e.ano || (recentes ? -1 : 9999);
        // Padrão: ENEM primeiro, a partir de 2009; depois as outras provas, das mais antigas para as mais novas.
        const enemPrimeiro = f.ordem === 'enem' ? (e => (origemDe(e) === 'enem' && e.fonte === 'enem' ? 0 : 1)) : () => 0;
        return lista.sort((a, c) => enemPrimeiro(a) - enemPrimeiro(c) || (recentes ? anoDe(c) - anoDe(a) : anoDe(a) - anoDe(c)) || ordemFonte(a) - ordemFonte(c) || String(a.ref ?? a.id).localeCompare(String(c.ref ?? c.id), 'pt', { numeric: true }));
    }
    const ordemFonte = e => ({ enem: 0, bluex: 1, vest: 2, ia: 3 })[e.fonte] ?? 4;

    // Contagem por tema e subtema dentro das entradas (para mostrar nos filtros).
    function contarAssuntos(entradas) {
        const c = {};
        for (const e of entradas) {
            const tema = `${e.disc}.${temaDe(e)}`;
            c[tema] = (c[tema] || 0) + 1;
            if (e.sub && !e.sub.endsWith('.')) c[`${e.disc}.${e.sub}`] = (c[`${e.disc}.${e.sub}`] || 0) + 1;
        }
        return c;
    }

    function desempenho(respondidas) {
        const porDisc = {}, porSub = {};
        for (const r of Object.values(respondidas || {})) {
            const disc = DISC[r.d] ? r.d : 'outras';
            const linha = porDisc[disc] ||= { total: 0, acertos: 0, erradas: 0 };
            linha.total++; if (r.ok) linha.acertos++; else linha.erradas++;
            if (DISC[disc] && r.s && A.nomeSub(disc, r.s)) {
                const chave = `${disc}.${r.s}`;
                const ls = porSub[chave] ||= { total: 0, acertos: 0 };
                ls.total++; if (r.ok) ls.acertos++;
            }
        }
        const fracos = Object.entries(porSub).filter(([, v]) => v.total >= 3).map(([k, v]) => ({ chave: k, ...v, pct: Math.round(v.acertos / v.total * 100) })).sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, 6);
        return { porDisc, porSub, fracos };
    }

    // ----- Matérias do aluno -> disciplinas do banco -----
    const chaveMateria = m => window.KingSubjectIcons?.chave?.(m?.subject, m?.area) || '';
    function discDaMateria(m) {
        if (!m) return [];
        const nome = A.norm(m.subject);
        if (/ingles/.test(nome)) return ['ingles'];
        if (/espanhol/.test(nome)) return ['espanhol'];
        const k = chaveMateria(m);
        if (k === 'redacao') return [];
        if (k === 'matematica') return ['matematica', 'geometria', 'estatistica'];
        if (k === 'idiomas') return ['ingles', 'espanhol'];
        if (k === 'interpretacao') return ['portugues', 'literatura'];
        if (k === 'atualidades') return ['geografia', 'sociologia', 'historia'];
        if (DISC[k]) return [k];
        return AREAS[m.area] ? A.discDaArea(m.area) : [];
    }

    // ----- Estado -----
    const banco = () => {
        const d = dados();
        if (!d.bancoQuestoes || typeof d.bancoQuestoes !== 'object') d.bancoQuestoes = {};
        const b = d.bancoQuestoes;
        if (!b.respondidas || typeof b.respondidas !== 'object') b.respondidas = {};
        if (!b.salvas || typeof b.salvas !== 'object') b.salvas = {};
        if (!Array.isArray(b.geradas)) b.geradas = [];
        return b;
    };
    const CHAVE_ESCOLHA = 'qg_qb_materias';
    const lerEscolha = () => { try { return JSON.parse(localStorage.getItem(CHAVE_ESCOLHA) || '[]').filter(d => DISC[d]); } catch { return []; } };
    const novoFiltro = (base = {}) => ({ discs: [], temas: [], subs: [], origens: [], ids: [], prova: '', anoDe: '', anoAte: '', dif: '', imagem: '', situacao: '', ordem: 'enem', semente: String(Math.random()), ...base });
    const estado = { vista: 'escolher', escolha: lerEscolha(), f: novoFiltro(), limite: POR_PAGINA, carregando: false, erro: '', abertos: {},
        gerando: false, gerador: false, geradorQtd: 5, geradorNivel: 'medio', geradorBanca: 'ENEM', geradorMateria: '', filtrosAbertos: false };
    const cartoes = new Map();   // id -> { escolha, respondida, resolucao, carregando }
    const conteudos = new Map(); // id -> questão pronta para o cartão (ou { erro })
    const buscando = new Set();

    function entradasAtuais() {
        const discs = estado.f.discs.length ? estado.f.discs : estado.escolha;
        return [...discs.flatMap(d => indices.get(d) || []), ...entradasIa(discs)];
    }
    const resultado = () => filtrar(entradasAtuais(), estado.f, banco());

    async function prepararIndices(discs) {
        estado.carregando = true; estado.erro = '';
        render();
        try { await Promise.all(discs.map(carregarIndice)); }
        catch (error) { estado.erro = error?.message || 'Não foi possível carregar as questões.'; }
        estado.carregando = false;
        render();
    }

    // ----- Texto de cada questão, baixado só quando o cartão aparece -----
    async function buscarConteudo(e) {
        if (e.fonte === 'ia') {
            const q = banco().geradas.find(x => x.id === e.id);
            return q ? { formato: 'ia', rotulo: `Criada pela IA · estilo ${q.banca}`, contexto: q.contexto, introducao: '', alternativas: q.alternativas, correta: q.correta, explicacao: q.explicacao, imagens: [], foto: q.imagem || null } : null;
        }
        if (e.fonte === 'enem') {
            const [ano, n, lingua] = String(e.ref).split('-');
            const r = await fetch(`${ENEM_API}/exams/${ano}/questions/${n}${lingua ? `?language=${lingua}` : ''}`);
            if (r.status === 429) throw new Error('pausa');
            if (!r.ok) throw new Error('falhou');
            return normalizarEnem(await r.json());
        }
        const ds = e.fonte === 'vest' ? 'dataset=CEIA-POSITIVO/vestibular-gen_qa&config=default&split=train' : 'dataset=portuguese-benchmark-datasets/BLUEX&config=default&split=questions';
        const r = await fetch(`${HF}?${ds}&offset=${e.ref}&length=1`);
        if (r.status === 429) throw new Error('pausa');
        if (!r.ok) throw new Error('falhou');
        const row = (await r.json())?.rows?.[0]?.row;
        return e.fonte === 'vest' ? normalizarVestibular(row?.original_question) : normalizarBluex(row);
    }
    let fila = [];
    let ativos = 0;
    function pedirConteudos(entradas) {
        for (const e of entradas) if (!conteudos.has(e.id) && !buscando.has(e.id) && !fila.includes(e)) fila.push(e);
        rodarFila();
    }
    function rodarFila() {
        while (ativos < 4 && fila.length) {
            const e = fila.shift();
            buscando.add(e.id); ativos++;
            buscarConteudo(e).then(q => conteudos.set(e.id, q || { erro: 'Esta questão não está disponível na fonte.' }))
                .catch(err => conteudos.set(e.id, { erro: err?.message === 'pausa' ? 'A fonte pediu uma pausa. Tente de novo em alguns segundos.' : 'Não foi possível baixar esta questão.', tentar: true }))
                .finally(() => { buscando.delete(e.id); ativos--; renderCard(e.id); rodarFila(); });
        }
    }

    // ----- Registro das respostas -----
    function materiaDaEntrada(e) {
        const materias = dados().cycleItems || [];
        if (e.fonte === 'ia') { const q = banco().geradas.find(x => x.id === e.id); const m = materias.find(x => String(x.id) === String(q?.materiaId)); if (m) return m; }
        const candidatas = materias.filter(m => discDaMateria(m).includes(e.disc));
        return candidatas.sort((a, b) => discDaMateria(a).length - discDaMateria(b).length)[0] || null;
    }
    function registrar(e, escolha, correta) {
        const ok = escolha === correta;
        const b = banco();
        const antes = b.respondidas[e.id];
        b.respondidas[e.id] = { ok, em: Date.now(), d: e.disc, s: e.sub || '', n: (Number(antes?.n) || (antes ? 1 : 0)) + 1 };
        const d = dados();
        const materia = materiaDaEntrada(e);
        const campo = ok ? 'acertos' : 'erros';
        if (materia) {
            materia.questoes = (Number(materia.questoes) || 0) + 1;
            materia[campo] = (Number(materia[campo]) || 0) + 1;
        }
        // Um registro por dia e por matéria no histórico, somando as questões do banco.
        if (typeof criarItemHistoricoRegistro === 'function' && Array.isArray(d.historyItems)) {
            const nome = materia ? materia.subject : (DISC[e.disc]?.nome || 'Questões');
            const novo = criarItemHistoricoRegistro({ segundos: 0, materia: nome, assunto: 'Banco de questões', cor: materia?.color || '#2563eb', tipo: 'Estudo', comentario: '', atividade: 'estudo' });
            let item = d.historyItems.find(h => h.origem === 'banco-questoes' && h.dataISO === novo.dataISO && h.materia === nome);
            if (!item) { item = Object.assign(novo, { questoes: 0, acertos: 0, erros: 0, subjectId: materia?.id || '', origem: 'banco-questoes' }); d.historyItems.push(item); }
            item.questoes = (Number(item.questoes) || 0) + 1;
            item[campo] = (Number(item[campo]) || 0) + 1;
            item.comentario = `${item.acertos} de ${item.questoes} acertos no banco de questões.`;
        }
        window.saveAppData?.();
        if (typeof renderizarCiclo === 'function') try { renderizarCiclo(); } catch { /* a tela de matérias se atualiza depois */ }
    }
    function alternarSalva(id) {
        const b = banco();
        if (b.salvas[id]) delete b.salvas[id]; else b.salvas[id] = Date.now();
        window.saveAppData?.();
    }

    // Resoluções ficam só neste aparelho (não pesam na nuvem).
    const CHAVE_IA = 'qg_qb_resolucoes';
    const lerResolucoes = () => { try { return JSON.parse(localStorage.getItem(CHAVE_IA) || '{}') || {}; } catch { return {}; } };
    function guardarResolucao(id, texto) {
        try {
            const todas = lerResolucoes();
            todas[id] = texto;
            const chaves = Object.keys(todas);
            chaves.slice(0, Math.max(0, chaves.length - 150)).forEach(k => delete todas[k]);
            localStorage.setItem(CHAVE_IA, JSON.stringify(todas));
        } catch { /* sem espaço: o texto fica só na tela */ }
    }
    async function pedirResolucao(e) {
        const c = cartao(e.id), q = conteudos.get(e.id);
        if (c.carregando || !q || q.erro) return;
        const salva = lerResolucoes()[e.id];
        if (salva) { c.resolucao = salva; renderCard(e.id); return; }
        c.carregando = true; renderCard(e.id);
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.explainQuestion) throw new Error('A resolução com IA não está disponível agora. Entre na sua conta e tente de novo.');
            const texto = await window.kingGemini.explainQuestion({
                question: `${String(q.contexto).replace(/!\[[^\]]*\]\([^)]*\)/g, '[imagem]')}\n\n${q.introducao || ''}`,
                alternatives: q.alternativas.map(a => a.imagem ? '[alternativa em imagem]' : a.texto).concat(Array(5).fill('—')).slice(0, 5),
                correct: LETRAS[q.correta], chosen: c.escolha === null ? '' : LETRAS[c.escolha], hasImage: !!q.temImagem, exam: q.rotulo,
            });
            c.resolucao = texto;
            guardarResolucao(e.id, texto);
        } catch (error) {
            toast(error?.message || 'Não foi possível explicar a questão agora.', true);
        } finally {
            c.carregando = false; renderCard(e.id);
        }
    }

    // ----- Questões criadas pela IA -----
    async function fotoIlustrativa(busca) {
        if (!busca) return null;
        try {
            const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(busca)}&page_size=10&mature=false`);
            if (!r.ok) return null;
            const f = ((await r.json())?.results || []).find(x => /^https:\/\/[^\s"'<>]+$/.test(String(x?.url || '')) && Number(x.width) >= 480 && !/\.(svg|gif)(\?|$)/i.test(x.url));
            return f ? { src: f.url, autor: String(f.creator || '').slice(0, 60), licenca: String(f.license || '').toUpperCase().slice(0, 12), pagina: /^https:\/\//.test(String(f.foreign_landing_url || '')) ? f.foreign_landing_url : '' } : null;
        } catch { return null; }
    }
    function assuntoDoGerador() {
        const sub = estado.f.subs[0];
        if (sub) { const [d, t, s] = sub.split('.'); return A.nomeSub(d, `${t}.${s}`); }
        const tema = estado.f.temas[0];
        if (tema) { const [d, t] = tema.split('.'); return A.nomeTema(d, t); }
        return '';
    }
    async function gerarComIa() {
        if (estado.gerando) return;
        const materia = (dados().cycleItems || []).find(m => String(m.id) === String(estado.geradorMateria));
        if (!materia) { toast('Escolha a matéria para a IA criar as questões.', true); return; }
        estado.gerando = true; renderGerador();
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateMockQuestions) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
            const assunto = assuntoDoGerador();
            const ja = banco().geradas.filter(q => String(q.materiaId) === String(materia.id)).slice(0, 15).map(q => q.contexto.slice(0, 160));
            const lista = await window.kingGemini.generateMockQuestions({ subjects: [materia.subject], topics: assunto ? [assunto] : [], count: estado.geradorQtd, level: estado.geradorNivel, banca: estado.geradorBanca, banco: true, avoid: ja });
            if (!lista.length) throw new Error('A IA não trouxe questões válidas. Tente de novo ou mude o assunto.');
            const discs = discDaMateria(materia);
            const novas = lista.map((q, i) => {
                const disc = discs.length > 1 ? (A.disciplina(`${q.topic} ${q.stem}`, discs).disc || discs[0]) : discs[0];
                return { id: `ia-${Date.now().toString(36)}-${i}`, fonte: 'ia', banca: estado.geradorBanca, nivel: estado.geradorNivel, discs: [disc], disc, sub: A.subtema(disc, `${q.topic} ${q.stem}`), materiaId: materia.id, materiaNome: q.subject,
                    assuntoNome: String(q.topic || assunto || '').slice(0, 100), contexto: String(q.stem || ''), busca: String(q.busca || '').slice(0, 60),
                    alternativas: q.choices.map((texto, k) => ({ letra: LETRAS[k], texto: String(texto), imagem: '' })), correta: q.correctIndex, explicacao: String(q.explanation || ''), em: Date.now() };
            });
            const b = banco();
            b.geradas = [...novas, ...b.geradas].slice(0, MAX_GERADAS);
            window.saveAppData?.();
            estado.f = novoFiltro({ discs: estado.f.discs, origens: ['ia'], ordem: 'recentes' });
            estado.gerador = false; estado.limite = POR_PAGINA;
            toast(`${novas.length} questões novas no banco.`);
            (async () => {
                for (const q of novas) {
                    const foto = await fotoIlustrativa(q.busca || q.assuntoNome);
                    const salva = banco().geradas.find(x => x.id === q.id);
                    if (foto && salva) { salva.imagem = foto; conteudos.delete(q.id); pedirConteudos([{ id: q.id, fonte: 'ia' }]); }
                }
                window.saveAppData?.();
            })();
        } catch (error) {
            toast(error?.message || 'Não foi possível criar as questões agora.', true);
        } finally {
            estado.gerando = false; render();
        }
    }
    function excluirGerada(id) {
        const b = banco();
        b.geradas = b.geradas.filter(q => q.id !== id);
        conteudos.delete(id);
        window.saveAppData?.();
        renderLista();
    }

    // ----- Interface -----
    const cartao = id => { if (!cartoes.has(id)) cartoes.set(id, { escolha: null, respondida: false, resolucao: '', carregando: false }); return cartoes.get(id); };
    const iconeDisc = d => window.KingSubjectIcons?.svg?.(ICONE_DISC[d] || d) || '';
    const chipsFiltro = (campo, lista, atual) => lista.map(([valor, rotulo]) => `<button type="button" class="qb-chip" data-qb-set="${campo}" data-qb-valor="${esc(valor)}" aria-pressed="${String(valor) === String(atual)}">${esc(rotulo)}</button>`).join('');

    function estatisticas() {
        const b = banco();
        const resp = Object.values(b.respondidas);
        const ok = resp.filter(r => r.ok).length;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        return { feitas: resp.length, percentual: resp.length ? Math.round(ok / resp.length * 100) : 0, hoje: resp.filter(r => r.em >= hoje.getTime()).length, erradas: resp.length - ok, salvas: Object.keys(b.salvas).length };
    }

    // Tela inicial: escolher as matérias.
    function htmlEscolher() {
        const total = resumo || {};
        const materias = (dados().cycleItems || []).map(m => [m, discDaMateria(m).filter(d => total[d])]).filter(([, ds]) => ds.length);
        const escolhidas = new Set(estado.escolha);
        const soma = estado.escolha.reduce((n, d) => n + (total[d] || 0), 0);
        const grupos = Object.entries(AREAS).map(([area, nome]) => `<section class="qb-pick-area"><h3>${nome}</h3><div class="qb-pick-grid">${A.discDaArea(area).filter(d => total[d]).map(d => `
            <button type="button" class="qb-pick${escolhidas.has(d) ? ' is-on' : ''}" data-qb-escolher="${d}" aria-pressed="${escolhidas.has(d)}"><span class="qb-pick-icon">${iconeDisc(d)}</span><span><strong>${esc(DISC[d].nome)}</strong><small>${numero(total[d])} questões · ${Object.keys(DISC[d].temas).length} ${Object.keys(DISC[d].temas).length === 1 ? 'tema' : 'temas'}</small></span><span class="qb-pick-check" aria-hidden="true">✓</span></button>`).join('')}</div></section>`).join('');
        return `<section class="widget qb-picker">
            <header class="qb-picker-head"><div><span class="workspace-kicker">PASSO 1</span><h2>Escolha as matérias que você quer treinar</h2><p>Questões reais do ENEM (2009–2023), da FUVEST e da UNICAMP, de vestibulares de todo o país e de concursos militares, separadas por tema e subtema.</p></div></header>
            ${materias.length ? `<div class="qb-field"><span class="qb-label">Atalho: suas matérias</span><div class="qb-chips">${materias.map(([m, ds]) => `<button type="button" class="qb-chip" data-qb-materia="${esc(m.id)}" aria-pressed="${ds.every(d => escolhidas.has(d))}">${esc(m.subject)}</button>`).join('')}</div></div>` : ''}
            ${resumo ? grupos : '<div class="qb-empty"><span class="qb-spinner" aria-hidden="true"></span><p>Carregando o banco…</p></div>'}
            <footer class="qb-picker-foot"><span>${estado.escolha.length ? `${estado.escolha.length} matéria${estado.escolha.length === 1 ? '' : 's'} · ${numero(soma)} questões` : 'Nenhuma matéria escolhida'}</span>
                <div>${estado.escolha.length ? '<button type="button" class="cycle-btn" data-qb-limpar-escolha>Limpar</button>' : ''}<button type="button" class="cycle-btn primary" data-qb-ver${estado.escolha.length ? '' : ' disabled'}>Ver questões</button></div></footer>
        </section>`;
    }

    function htmlFiltros() {
        const f = estado.f;
        const base = [...estado.escolha.flatMap(d => indices.get(d) || []), ...entradasIa(estado.escolha)];
        const contagem = contarAssuntos(f.discs.length ? base.filter(e => f.discs.includes(e.disc)) : base);
        const ativos = ['temas', 'subs', 'origens'].reduce((n, k) => n + (f[k].length ? 1 : 0), 0) + ['prova', 'anoDe', 'anoAte', 'dif', 'imagem', 'situacao'].filter(k => f[k]).length + (f.discs.length ? 1 : 0);
        const provas = Object.entries(base.reduce((o, e) => (e.fonte !== 'ia' && (o[e.prova] = (o[e.prova] || 0) + 1), o), {})).sort((a, b) => b[1] - a[1]);
        const anos = [...new Set(base.map(e => e.ano).filter(Boolean))].sort((a, b) => a - b);
        const arvore = estado.escolha.map(d => {
            const temas = Object.entries(DISC[d].temas).filter(([t]) => contagem[`${d}.${t}`]);
            // Questões sem tema reconhecido ficam num grupo próprio.
            if (contagem[`${d}.`]) temas.push(['', { nome: 'Outros assuntos', subs: {} }]);
            const aberta = estado.abertos[d] ?? (estado.escolha.length <= 2);
            return `<div class="qb-tree-area${aberta ? ' is-open' : ''}">
                <button type="button" class="qb-tree-title" data-qb-abrir-disc="${d}" aria-expanded="${aberta}"><span class="qb-tree-icon">${iconeDisc(d)}</span><span>${esc(DISC[d].nome)}</span>${f.temas.concat(f.subs).some(x => x.startsWith(`${d}.`)) ? '<span class="qb-badge">•</span>' : ''}</button>
                <div class="qb-tree-body">${temas.map(([t, tema]) => {
                    const chaveTema = `${d}.${t}`;
                    const marcado = f.temas.includes(chaveTema);
                    const subs = Object.entries(tema.subs).filter(([s]) => contagem[`${d}.${t}.${s}`]);
                    const abertoTema = estado.abertos[chaveTema] ?? (marcado || subs.some(([s]) => f.subs.includes(`${chaveTema}.${s}`)));
                    return `<div class="qb-tema${abertoTema ? ' is-open' : ''}">
                        <div class="qb-tema-row"><label class="qb-check"><input type="checkbox" data-qb-tema="${chaveTema}"${marcado ? ' checked' : ''}><span>${esc(tema.nome)}</span></label><small>${numero(contagem[chaveTema])}</small>${subs.length ? `<button type="button" class="qb-tema-toggle" data-qb-abrir-tema="${chaveTema}" aria-expanded="${abertoTema}" aria-label="Subtemas de ${esc(tema.nome)}"></button>` : ''}</div>
                        ${subs.length ? `<div class="qb-tree-sub">${subs.map(([s, [nome]]) => { const k = `${chaveTema}.${s}`; return `<label class="qb-check is-sub"><input type="checkbox" data-qb-sub="${k}"${f.subs.includes(k) || marcado ? ' checked' : ''}${marcado ? ' disabled' : ''}><span>${esc(nome)}</span><small>${numero(contagem[k])}</small></label>`; }).join('')}</div>` : ''}
                    </div>`;
                }).join('')}</div>
            </div>`;
        }).join('');
        return `<aside class="widget qb-filters${estado.filtrosAbertos ? ' is-open' : ''}" aria-label="Filtros">
            <button type="button" class="qb-filters-toggle" data-qb-toggle-filtros aria-expanded="${estado.filtrosAbertos}">Filtros${ativos ? ` <span class="qb-badge">${ativos}</span>` : ''}</button>
            <div class="qb-filters-body">
                <div class="qb-filters-head"><h3>Filtros</h3>${ativos ? '<button type="button" class="qb-link" data-qb-limpar>Limpar tudo</button>' : ''}</div>
                ${estado.escolha.length > 1 ? `<div class="qb-field"><span class="qb-label">Matérias</span><div class="qb-chips">${chipsFiltro('disc', [['', 'Todas'], ...estado.escolha.map(d => [d, DISC[d].nome])], f.discs.length === 1 ? f.discs[0] : '')}</div></div>` : ''}
                <div class="qb-field"><span class="qb-label">Temas e subtemas</span><div class="qb-tree">${arvore || '<p class="qb-hint">Carregando…</p>'}</div></div>
                <div class="qb-field"><span class="qb-label">Origem</span><div class="qb-chips">${Object.entries(ORIGENS).map(([o, nome]) => `<button type="button" class="qb-chip" data-qb-origem="${o}" aria-pressed="${f.origens.includes(o)}">${nome}</button>`).join('')}</div></div>
                <label class="qb-field"><span class="qb-label">Prova ou instituição</span><select class="cycle-input" data-qb-f="prova"><option value="">Todas</option>${provas.map(([p, n]) => `<option value="${esc(p)}"${p === f.prova ? ' selected' : ''}>${esc(p)} (${numero(n)})</option>`).join('')}</select></label>
                <div class="qb-field"><span class="qb-label">Anos</span><div class="qb-row">
                    <select class="cycle-input" data-qb-f="anoDe" aria-label="Ano inicial"><option value="">Desde ${anos[0] || ''}</option>${anos.map(a => `<option value="${a}"${String(a) === String(f.anoDe) ? ' selected' : ''}>De ${a}</option>`).join('')}</select>
                    <select class="cycle-input" data-qb-f="anoAte" aria-label="Ano final"><option value="">Até ${anos[anos.length - 1] || ''}</option>${anos.slice().reverse().map(a => `<option value="${a}"${String(a) === String(f.anoAte) ? ' selected' : ''}>Até ${a}</option>`).join('')}</select>
                </div></div>
                <div class="qb-field"><span class="qb-label">Dificuldade <small>vestibulares e IA</small></span><div class="qb-segment">${chipsFiltro('dif', [['', 'Todas'], ...Object.entries(DIFICULDADES)], f.dif)}</div></div>
                <div class="qb-field"><span class="qb-label">Imagens</span><div class="qb-segment">${chipsFiltro('imagem', [['', 'Tanto faz'], ['com', 'Com imagem'], ['sem', 'Só texto']], f.imagem)}</div></div>
                <div class="qb-field"><span class="qb-label">Situação</span><div class="qb-segment">${chipsFiltro('situacao', [['', 'Todas'], ['nao', 'Não fiz'], ['errei', 'Errei'], ['acertei', 'Acertei'], ['salvas', '★ Salvas']], f.situacao)}</div></div>
            </div>
        </aside>`;
    }

    function htmlGerador() {
        const materias = (dados().cycleItems || []).filter(m => discDaMateria(m).some(d => estado.escolha.includes(d)));
        if (!materias.some(m => String(m.id) === String(estado.geradorMateria))) estado.geradorMateria = String(materias[0]?.id || '');
        const assunto = assuntoDoGerador();
        if (!estado.gerador) return `<button type="button" class="qb-gen-open" data-qb-gerador><span class="qb-gen-icon" aria-hidden="true">✦</span><span><strong>Gerar questões com IA</strong><small>Crie questões novas no estilo ENEM, FUVEST, UNICAMP, UNESP ou UERJ, com resolução e imagem ilustrativa</small></span></button>`;
        return `<section class="widget qb-gen" aria-label="Gerar questões com IA">
            <div class="qb-gen-head"><strong>Gerar questões com IA</strong><button type="button" class="qb-link" data-qb-gerador>Fechar</button></div>
            ${materias.length ? `<div class="qb-gen-row">
                <label class="qb-field"><span class="qb-label">Matéria</span><select class="cycle-input" data-qb-gen-materia>${materias.map(m => `<option value="${esc(m.id)}"${String(m.id) === String(estado.geradorMateria) ? ' selected' : ''}>${esc(m.subject)}</option>`).join('')}</select></label>
                <div class="qb-field"><span class="qb-label">Assunto</span><span class="qb-hint">${assunto ? esc(assunto) : 'Todos (marque um tema ou subtema nos filtros)'}</span></div>
            </div>` : '<p class="qb-hint">Cadastre uma matéria ligada às matérias escolhidas para gerar questões com IA.</p>'}
            <div class="qb-field"><span class="qb-label">Estilo de prova</span><div class="qb-chips">${BANCAS_IA.map(b => `<button type="button" class="qb-chip" data-qb-gen="geradorBanca" data-qb-valor="${b}" aria-pressed="${estado.geradorBanca === b}">${b}</button>`).join('')}</div></div>
            <div class="qb-gen-row">
                <div class="qb-field"><span class="qb-label">Nível</span><div class="qb-segment">${Object.entries(NIVEIS_IA).map(([v, r]) => `<button type="button" class="qb-chip" data-qb-gen="geradorNivel" data-qb-valor="${v}" aria-pressed="${estado.geradorNivel === v}">${r}</button>`).join('')}</div></div>
                <div class="qb-field"><span class="qb-label">Quantidade</span><div class="qb-segment">${[3, 5, 8, 10].map(n => `<button type="button" class="qb-chip" data-qb-gen="geradorQtd" data-qb-valor="${n}" aria-pressed="${estado.geradorQtd === n}">${n}</button>`).join('')}</div></div>
            </div>
            <div class="qb-gen-foot"><small>Questões originais com resolução. Não são questões reais dessas provas.</small><button type="button" class="cycle-btn primary" data-qb-gerar${estado.gerando || !materias.length ? ' disabled' : ''}>${estado.gerando ? 'Criando questões…' : 'Gerar'}</button></div>
        </section>`;
    }

    function htmlCartao(e, n) {
        const c = cartao(e.id);
        const q = conteudos.get(e.id);
        const b = banco();
        const anterior = b.respondidas[e.id];
        const salva = !!b.salvas[e.id];
        const origem = origemDe(e);
        const assunto = A.nomeSub(e.disc, e.sub) || A.nomeTema(e.disc, e.sub);
        const cabeca = `<header class="qb-item-head"><span class="qb-num">${n}</span><span class="qb-tag is-${origem}">${esc(q?.rotulo || `${e.prova} ${e.ano || ''}`)}</span><span>${esc(DISC[e.disc]?.nome || '')}${assunto ? ` · ${esc(assunto)}` : ''}</span>${e.dif ? `<span class="qb-level is-${e.dif}">${DIFICULDADES[e.dif]}</span>` : ''}${!c.respondida && anterior ? `<span class="qb-done ${anterior.ok ? 'ok' : 'bad'}">${anterior.ok ? 'Acertou' : 'Errou'} em ${dataCurta(anterior.em)}${anterior.n > 1 ? ` · ${anterior.n}×` : ''}</span>` : ''}<span class="qb-item-tools"><button type="button" class="qb-icon-btn${salva ? ' is-on' : ''}" data-qb-salvar aria-pressed="${salva}" title="${salva ? 'Tirar das salvas' : 'Salvar questão'}" aria-label="${salva ? 'Tirar das salvas' : 'Salvar questão'}">${salva ? '★' : '☆'}</button>${e.fonte === 'ia' ? '<button type="button" class="qb-icon-btn" data-qb-excluir title="Tirar do banco" aria-label="Tirar esta questão do banco">×</button>' : ''}</span></header>`;
        if (!q) return `<article class="widget qb-item is-loading" data-qb-id="${esc(e.id)}">${cabeca}<div class="qb-skeleton"><span></span><span></span><span></span><span></span></div></article>`;
        if (q.erro) return `<article class="widget qb-item" data-qb-id="${esc(e.id)}">${cabeca}<div class="qb-error"><span>${esc(q.erro)}</span>${q.tentar ? '<button type="button" class="qb-link" data-qb-tentar>Tentar de novo</button>' : ''}</div></article>`;
        const foto = q.foto?.src ? `<figure class="qb-figure"><img src="${esc(q.foto.src)}" alt="Imagem ilustrativa" loading="lazy" referrerpolicy="no-referrer" data-qb-foto><figcaption>Imagem ilustrativa${q.foto.autor ? ` · ${q.foto.pagina ? `<a href="${esc(q.foto.pagina)}" target="_blank" rel="noopener">${esc(q.foto.autor)}</a>` : esc(q.foto.autor)}` : ''}${q.foto.licenca ? ` · ${esc(q.foto.licenca)}` : ''}</figcaption></figure>` : '';
        let corpo = q.formato === 'markdown' ? markdown(q.contexto) : q.formato === 'ia' ? textoIa(q.contexto) : textoPlano(q.contexto);
        // Nas provas da FUVEST e da UNICAMP a figura entra onde o texto marca "[IMAGE n]".
        const usadas = new Set();
        const figura = src => `<img src="${esc(src)}" alt="Figura da questão" loading="lazy">`;
        corpo = corpo.replace(/(?:<p>)?\[IMAGE (\d+)\](?:<\/p>)?/g, (_, i) => { const src = q.imagens?.[Number(i)]; if (!src) return ''; usadas.add(Number(i)); return figura(src); });
        const imagens = (q.imagens || []).filter((_, i) => !usadas.has(i)).map(figura).join('');
        const alternativas = q.alternativas.map((a, k) => {
            const classes = ['qb-alt'];
            if (c.respondida) { if (k === q.correta) classes.push('is-correct'); else if (k === c.escolha) classes.push('is-wrong'); }
            else if (k === c.escolha) classes.push('is-selected');
            const conteudo = a.imagem ? `<img src="${esc(a.imagem)}" alt="Alternativa ${a.letra}" loading="lazy">` : esc(a.texto);
            return `<button type="button" class="${classes.join(' ')}" data-qb-alt="${k}"${c.respondida ? ' disabled' : ''}><span class="qb-letter">${a.letra}</span><span class="qb-alt-text">${conteudo}</span></button>`;
        }).join('');
        let rodape;
        if (!c.respondida) rodape = `<div class="qb-item-actions"><button type="button" class="cycle-btn primary" data-qb-responder${c.escolha === null ? ' disabled' : ''}>Responder</button></div>`;
        else {
            const acertou = c.escolha === q.correta;
            const resolucao = q.explicacao || c.resolucao;
            const botao = !resolucao ? `<button type="button" class="cycle-btn" data-qb-resolver${c.carregando ? ' disabled' : ''}>${c.carregando ? 'Resolvendo…' : 'Ver resolução'}</button>` : '';
            rodape = `<div class="qb-feedback ${acertou ? 'ok' : 'bad'}"><strong>${acertou ? '✓ Você acertou!' : `✗ Resposta certa: ${LETRAS[q.correta]}`}</strong>${e.fonte === 'enem' ? '<span>Gabarito oficial do Inep</span>' : e.fonte === 'ia' ? '' : '<span>Gabarito da prova</span>'}</div>
                ${resolucao ? `<div class="qb-resolution"><span class="qb-label">Resolução${q.explicacao ? '' : ' · explicada pela IA'}</span>${textoIa(resolucao)}</div>` : ''}
                <div class="qb-item-actions">${botao}<button type="button" class="cycle-btn" data-qb-refazer>Refazer</button></div>`;
        }
        return `<article class="widget qb-item" data-qb-id="${esc(e.id)}">${cabeca}
            <div class="qb-question">${foto}${corpo}${imagens}${q.introducao ? `<p class="qb-intro">${esc(q.introducao)}</p>` : ''}</div>
            <div class="qb-alts" role="group" aria-label="Alternativas">${alternativas}</div>
            <footer class="qb-item-foot">${rodape}</footer>
        </article>`;
    }

    function htmlResumoFiltros() {
        const f = estado.f;
        const partes = [];
        if (f.ids.length) partes.push(['ids', '', f.ids.length === 1 ? 'Questão escolhida' : `${f.ids.length} questões`]);
        f.discs.forEach(d => partes.push(['disc', d, DISC[d]?.nome || d]));
        f.temas.forEach(k => { const [d, t] = k.split('.'); partes.push(['temas', k, A.nomeTema(d, t) || `${DISC[d]?.nome || ''} · outros assuntos`]); });
        f.subs.forEach(k => { const [d, t, s] = k.split('.'); partes.push(['subs', k, A.nomeSub(d, `${t}.${s}`)]); });
        f.origens.forEach(o => partes.push(['origens', o, ORIGENS[o]]));
        if (f.prova) partes.push(['prova', '', f.prova]);
        if (f.anoDe || f.anoAte) partes.push(['anos', '', `${f.anoDe || '…'}–${f.anoAte || '…'}`]);
        if (f.dif) partes.push(['dif', '', DIFICULDADES[f.dif]]);
        if (f.imagem) partes.push(['imagem', '', f.imagem === 'com' ? 'Com imagem' : 'Só texto']);
        if (f.situacao) partes.push(['situacao', '', { nao: 'Não fiz', errei: 'Errei', acertei: 'Acertei', salvas: 'Salvas' }[f.situacao]]);
        return partes.length ? `<div class="qb-active">${partes.map(([campo, valor, rotulo]) => `<button type="button" class="qb-active-chip" data-qb-tirar="${campo}" data-qb-valor="${esc(valor)}" aria-label="Tirar filtro ${esc(rotulo)}">${esc(rotulo)} <span aria-hidden="true">×</span></button>`).join('')}</div>` : '';
    }

    function htmlLista() {
        if (estado.carregando) return '<div class="qb-empty"><span class="qb-spinner" aria-hidden="true"></span><p>Carregando o banco de questões…</p></div>';
        if (estado.erro) return `<div class="qb-error"><span>${esc(estado.erro)}</span><button type="button" class="qb-link" data-qb-recarregar>Tentar de novo</button></div>`;
        const lista = resultado();
        const visiveis = lista.slice(0, estado.limite);
        const f = estado.f;
        const vazio = f.situacao === 'salvas' ? 'Nenhuma questão salva com esses filtros. Toque na ☆ de uma questão para guardá-la aqui.'
            : f.situacao === 'errei' ? 'Nenhuma questão errada com esses filtros. Bom sinal!'
            : f.origens.length === 1 && f.origens[0] === 'ia' ? 'Nenhuma questão criada pela IA com esses filtros. Gere algumas acima.'
            : 'Nenhuma questão com esses filtros. Desmarque algum tema, amplie os anos ou limpe os filtros.';
        return `${htmlResumoFiltros()}<div class="qb-list-head"><span>${numero(lista.length)} ${lista.length === 1 ? 'questão' : 'questões'}</span>
                <label class="qb-order">Ordem <select class="cycle-input" data-qb-f="ordem"><option value="enem"${f.ordem === 'enem' ? ' selected' : ''}>ENEM primeiro (desde 2009)</option><option value="antigas"${f.ordem === 'antigas' ? ' selected' : ''}>Mais antigas primeiro</option><option value="recentes"${f.ordem === 'recentes' ? ' selected' : ''}>Mais recentes primeiro</option><option value="aleatoria"${f.ordem === 'aleatoria' ? ' selected' : ''}>Misturar</option></select></label></div>
            <div class="qb-items">${visiveis.map((e, i) => htmlCartao(e, i + 1)).join('')}</div>
            ${lista.length ? '' : `<div class="qb-empty"><p>${vazio}</p></div>`}
            ${lista.length > estado.limite ? `<div class="qb-more"><button type="button" class="cycle-btn" data-qb-mais>Carregar mais ${Math.min(POR_PAGINA, lista.length - estado.limite)} questões</button></div>` : ''}`;
    }

    function rotuloResposta(id) {
        let m = /^enem-(\d{4})-(\d+)/.exec(id);
        if (m) return `ENEM ${m[1]} · questão ${m[2]}`;
        if (id.startsWith('vest-')) return 'Vestibular';
        if (id.startsWith('bluex-')) return 'FUVEST/UNICAMP';
        const q = banco().geradas.find(x => x.id === id);
        return q ? `IA · estilo ${q.banca}` : 'Questão criada pela IA (apagada)';
    }

    function htmlMinhas() {
        const b = banco();
        const st = estatisticas();
        if (!st.feitas && !st.salvas) return `<section class="widget qb-mine-empty"><h3>Você ainda não resolveu questões do banco</h3><p>As questões que você responder aparecem aqui, com seu desempenho por disciplina e subtema, o caderno de erros e as questões salvas.</p><button type="button" class="cycle-btn primary" data-qb-vista="escolher">Escolher matérias</button></section>`;
        const { porDisc, fracos } = desempenho(b.respondidas);
        const cor = pct => pct >= 70 ? 'ok' : pct >= 50 ? 'mid' : 'bad';
        const linhas = Object.entries(porDisc).sort((a, c) => c[1].total - a[1].total).map(([d, v]) => {
            const pct = Math.round(v.acertos / v.total * 100);
            return `<tr><th scope="row">${esc(DISC[d]?.nome || 'Outras')}</th><td>${v.total}</td><td><span class="qb-bar"><span style="width:${pct}%" class="${cor(pct)}"></span></span><strong>${pct}%</strong></td><td>${v.erradas && DISC[d] ? `<button type="button" class="qb-link" data-qb-rever-disc="${d}">Refazer ${v.erradas === 1 ? 'a errada' : `${v.erradas} erradas`}</button>` : ''}</td></tr>`;
        }).join('');
        const recentes = Object.entries(b.respondidas).sort((a, c) => c[1].em - a[1].em).slice(0, 12);
        return `<div class="qb-mine">
            <div class="qb-mine-cards">
                <button type="button" class="widget qb-mine-card" data-qb-ir="errei"><span>Caderno de erros</span><strong>${st.erradas}</strong><small>Questões que você errou na última tentativa</small></button>
                <button type="button" class="widget qb-mine-card" data-qb-ir="salvas"><span>★ Salvas</span><strong>${st.salvas}</strong><small>Questões que você guardou para rever</small></button>
                <button type="button" class="widget qb-mine-card" data-qb-ir="acertei"><span>Acertadas</span><strong>${st.feitas - st.erradas}</strong><small>${st.percentual}% de acerto no banco</small></button>
            </div>
            <section class="widget qb-mine-block"><h3>Desempenho por disciplina</h3>
                <table class="qb-table"><thead><tr><th scope="col">Disciplina</th><th scope="col">Feitas</th><th scope="col">Acerto</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${linhas}</tbody></table>
            </section>
            ${fracos.length ? `<section class="widget qb-mine-block"><h3>Subtemas para reforçar</h3><p class="qb-hint">Subtemas com pelo menos 3 questões feitas, do menor acerto para o maior.</p><ul class="qb-weak">${fracos.map(x => { const [d, t, s] = x.chave.split('.'); const nome = A.nomeSub(d, `${t}.${s}`) || A.nomeTema(d, t); return `<li><span>${esc(nome)} <small>${esc(DISC[d].nome)}</small></span><strong class="${cor(x.pct)}">${x.pct}%</strong><small>${x.acertos}/${x.total}</small><button type="button" class="qb-link" data-qb-treinar="${x.chave}">Treinar</button></li>`; }).join('')}</ul></section>` : ''}
            <section class="widget qb-mine-block"><h3>Atividade recente</h3><ul class="qb-recent">${recentes.map(([id, r]) => `<li><span class="qb-dot ${r.ok ? 'ok' : 'bad'}" aria-hidden="true"></span><span>${esc(rotuloResposta(id))}${DISC[r.d] ? ` <small>${esc(DISC[r.d].nome)}${A.nomeSub(r.d, r.s) ? ` · ${esc(A.nomeSub(r.d, r.s))}` : ''}</small>` : ''}</span><small>${r.ok ? 'Acertou' : 'Errou'} · ${dataCurta(r.em)}</small>${DISC[r.d] ? `<button type="button" class="qb-link" data-qb-abrir="${esc(id)}" data-qb-disc-de="${r.d}">Abrir</button>` : '<span></span>'}</li>`).join('')}</ul></section>
        </div>`;
    }

    function render() {
        const box = document.getElementById('questoesBanco');
        if (!box) return;
        const rolagem = box.querySelector('.qb-filters')?.scrollTop || 0;
        const st = estatisticas();
        const vista = estado.vista;
        const abas = `<div class="qb-views" role="tablist" aria-label="Banco de questões"><button type="button" role="tab" data-qb-vista="${estado.escolha.length && vista !== 'escolher' ? 'explorar' : 'escolher'}" aria-selected="${vista !== 'minhas'}">Questões</button><button type="button" role="tab" data-qb-vista="minhas" aria-selected="${vista === 'minhas'}">Minhas questões${st.feitas ? ` <span class="qb-badge">${st.feitas}</span>` : ''}</button></div>`;
        const escolhidas = vista === 'explorar' ? `<div class="qb-chosen"><span>${estado.escolha.map(d => `<span class="qb-chosen-item">${iconeDisc(d)}${esc(DISC[d].nome)}</span>`).join('')}</span><button type="button" class="qb-link" data-qb-vista="escolher">Trocar matérias</button></div>` : '';
        box.innerHTML = `<div class="qb-top">
                <div><span class="workspace-kicker">BANCO DE QUESTÕES</span><h2>ENEM, vestibulares e concursos</h2><p>Escolha as matérias, filtre por tema e subtema e responda direto em cada questão.</p></div>
                <dl class="qb-stats"><div><dt>Resolvidas</dt><dd>${st.feitas}</dd></div><div><dt>Acerto</dt><dd>${st.feitas ? `${st.percentual}%` : '—'}</dd></div><div><dt>Hoje</dt><dd>${st.hoje}</dd></div></dl>
            </div>${abas}
            ${vista === 'minhas' ? htmlMinhas() : vista === 'escolher' ? htmlEscolher() : `${escolhidas}<div class="qb-layout">${htmlFiltros()}<div class="qb-main"><div id="qbGerador">${htmlGerador()}</div><div id="qbLista">${htmlLista()}</div></div></div>`}`;
        const filtros = box.querySelector('.qb-filters');
        if (filtros) filtros.scrollTop = rolagem;
        if (vista === 'explorar') pedirVisiveis();
    }
    function pedirVisiveis() {
        if (estado.carregando || estado.erro) return;
        pedirConteudos(resultado().slice(0, estado.limite));
    }
    function renderLista() { const el = document.getElementById('qbLista'); if (el) { el.innerHTML = htmlLista(); pedirVisiveis(); } }
    function renderGerador() { const el = document.getElementById('qbGerador'); if (el) el.innerHTML = htmlGerador(); }
    function renderCard(id) {
        const el = [...document.querySelectorAll('#questoesBanco .qb-item')].find(x => x.dataset.qbId === id);
        const e = el && entradasAtuais().find(x => x.id === id);
        if (e) el.outerHTML = htmlCartao(e, Number(el.querySelector('.qb-num')?.textContent) || 1);
    }
    function atualizarEstatisticas() {
        const st = estatisticas();
        const dd = document.querySelectorAll('#questoesBanco .qb-stats dd');
        if (dd.length === 3) { dd[0].textContent = st.feitas; dd[1].textContent = st.feitas ? `${st.percentual}%` : '—'; dd[2].textContent = st.hoje; }
    }

    function aplicar(mudanca) {
        mudanca(estado.f);
        estado.limite = POR_PAGINA;
        render();
    }
    const alternar = (lista, valor) => lista.includes(valor) ? lista.filter(x => x !== valor) : [...lista, valor];
    function salvarEscolha() { try { localStorage.setItem(CHAVE_ESCOLHA, JSON.stringify(estado.escolha)); } catch { /* sem espaço */ } }
    async function verQuestoes(base = {}) {
        estado.vista = 'explorar';
        estado.f = novoFiltro(base);
        estado.limite = POR_PAGINA;
        salvarEscolha();
        await prepararIndices(estado.escolha);
        document.getElementById('questoesBanco')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
    // Atalhos de "Minhas questões": garante que a matéria esteja escolhida antes de filtrar.
    function irPara(discs, base) {
        discs.forEach(d => { if (DISC[d] && !estado.escolha.includes(d)) estado.escolha.push(d); });
        return verQuestoes(base);
    }

    // Abas da seção Questões: Banco de questões | Tempo por questão.
    function montar() {
        const secao = document.getElementById('question-timer');
        if (!secao || document.getElementById('questoesBanco')) return;
        const heading = secao.querySelector('.workspace-heading');
        if (heading) {
            const kicker = heading.querySelector('.workspace-kicker'); if (kicker) kicker.textContent = 'TREINO DE PROVA';
            const h1 = heading.querySelector('h1'); if (h1) h1.textContent = 'Questões';
            const p = heading.querySelector('p'); if (p) p.textContent = 'Um banco com questões do ENEM, de vestibulares e de concursos, separadas por matéria, tema e subtema.';
        }
        const abas = document.createElement('div');
        abas.className = 'plan-tabs qb-tabs';
        abas.setAttribute('role', 'tablist'); abas.setAttribute('aria-label', 'Questões');
        abas.innerHTML = '<button type="button" role="tab" data-qb-aba="banco" aria-selected="true">Banco de questões</button><button type="button" role="tab" data-qb-aba="tempo" aria-selected="false">Tempo por questão</button>';
        const box = document.createElement('div');
        box.id = 'questoesBanco';
        box.className = 'qb-root';
        const layout = secao.querySelector('.question-pace-layout');
        (heading || secao.firstElementChild)?.insertAdjacentElement('afterend', abas);
        abas.insertAdjacentElement('afterend', box);
        if (layout) layout.hidden = true;
        render();
        carregarResumo().then(() => { if (estado.vista === 'escolher') render(); });
    }

    function mostrarAba(aba) {
        const secao = document.getElementById('question-timer');
        if (!secao) return;
        secao.querySelectorAll('[data-qb-aba]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.qbAba === aba)));
        const layout = secao.querySelector('.question-pace-layout');
        if (layout) layout.hidden = aba !== 'tempo';
        document.getElementById('questoesBanco').hidden = aba !== 'banco';
        if (aba === 'banco') render();
    }

    document.addEventListener('click', event => {
        const alvo = event.target.closest('button');
        if (!alvo || !alvo.closest('#question-timer')) return;
        const d = alvo.dataset;
        if (d.qbAba) return mostrarAba(d.qbAba);
        if (!alvo.closest('#questoesBanco')) return;
        if (d.qbVista) { if (d.qbVista === 'explorar' && !estado.escolha.length) estado.vista = 'escolher'; else estado.vista = d.qbVista; return render(); }
        if (d.qbEscolher) { estado.escolha = alternar(estado.escolha, d.qbEscolher); return render(); }
        if (d.qbMateria) {
            const m = (dados().cycleItems || []).find(x => String(x.id) === d.qbMateria);
            const ds = discDaMateria(m).filter(x => resumo?.[x]);
            const todas = ds.every(x => estado.escolha.includes(x));
            estado.escolha = todas ? estado.escolha.filter(x => !ds.includes(x)) : [...new Set([...estado.escolha, ...ds])];
            estado.geradorMateria = d.qbMateria;
            return render();
        }
        if (alvo.hasAttribute('data-qb-limpar-escolha')) { estado.escolha = []; return render(); }
        if (alvo.hasAttribute('data-qb-ver')) return verQuestoes();
        if (alvo.hasAttribute('data-qb-recarregar')) return prepararIndices(estado.escolha);
        if (d.qbSet === 'disc') return aplicar(f => { f.discs = d.qbValor ? [d.qbValor] : []; f.ids = []; });
        if (d.qbSet) return aplicar(f => { f[d.qbSet] = d.qbValor; f.ids = []; });
        if (d.qbOrigem) return aplicar(f => { f.origens = alternar(f.origens, d.qbOrigem); f.ids = []; });
        if (d.qbTirar) return aplicar(f => {
            if (['disc', 'temas', 'subs', 'origens'].includes(d.qbTirar)) { const k = d.qbTirar === 'disc' ? 'discs' : d.qbTirar; f[k] = f[k].filter(x => x !== d.qbValor); }
            else if (d.qbTirar === 'ids') f.ids = [];
            else if (d.qbTirar === 'anos') { f.anoDe = ''; f.anoAte = ''; }
            else f[d.qbTirar] = '';
        });
        if (d.qbAbrirDisc) { const k = d.qbAbrirDisc; const aberto = alvo.getAttribute('aria-expanded') === 'true'; estado.abertos[k] = !aberto; alvo.closest('.qb-tree-area')?.classList.toggle('is-open', !aberto); alvo.setAttribute('aria-expanded', String(!aberto)); return; }
        if (d.qbAbrirTema) { const k = d.qbAbrirTema; const aberto = alvo.getAttribute('aria-expanded') === 'true'; estado.abertos[k] = !aberto; alvo.closest('.qb-tema')?.classList.toggle('is-open', !aberto); alvo.setAttribute('aria-expanded', String(!aberto)); return; }
        if (d.qbGen) { estado[d.qbGen] = d.qbGen === 'geradorQtd' ? Number(d.qbValor) : d.qbValor; return renderGerador(); }
        if (alvo.hasAttribute('data-qb-gerador')) { estado.gerador = !estado.gerador; return renderGerador(); }
        if (alvo.hasAttribute('data-qb-gerar')) return gerarComIa();
        if (alvo.hasAttribute('data-qb-limpar')) return aplicar(f => Object.assign(f, novoFiltro({ ordem: f.ordem, semente: f.semente })));
        if (alvo.hasAttribute('data-qb-toggle-filtros')) { estado.filtrosAbertos = !estado.filtrosAbertos; alvo.closest('.qb-filters')?.classList.toggle('is-open', estado.filtrosAbertos); alvo.setAttribute('aria-expanded', String(estado.filtrosAbertos)); return; }
        if (alvo.hasAttribute('data-qb-mais')) { estado.limite += POR_PAGINA; return renderLista(); }
        if (d.qbIr) return irPara(Object.values(banco().respondidas).map(r => r.d).concat(Object.keys(banco().salvas).map(id => banco().respondidas[id]?.d)).filter(Boolean), { situacao: d.qbIr });
        if (d.qbReverDisc) return irPara([d.qbReverDisc], { situacao: 'errei', discs: [d.qbReverDisc] });
        if (d.qbTreinar) { const [disc, t, s] = d.qbTreinar.split('.'); return irPara([disc], { discs: [disc], subs: [`${disc}.${t}.${s}`] }); }
        if (d.qbAbrir) return irPara([d.qbDiscDe], { ids: [d.qbAbrir] });
        const item = alvo.closest('.qb-item');
        if (!item) return;
        const e = entradasAtuais().find(x => x.id === item.dataset.qbId);
        if (!e) return;
        const c = cartao(e.id);
        const q = conteudos.get(e.id);
        if (alvo.hasAttribute('data-qb-salvar')) { alternarSalva(e.id); return renderCard(e.id); }
        if (alvo.hasAttribute('data-qb-excluir')) { if (window.confirm('Tirar esta questão criada pela IA do seu banco?')) excluirGerada(e.id); return; }
        if (alvo.hasAttribute('data-qb-tentar')) { conteudos.delete(e.id); renderCard(e.id); return pedirConteudos([e]); }
        if (!q || q.erro) return;
        if (d.qbAlt !== undefined) { if (!c.respondida) { c.escolha = Number(d.qbAlt); renderCard(e.id); } }
        else if (alvo.hasAttribute('data-qb-responder')) { if (c.escolha === null || c.respondida) return; c.respondida = true; registrar(e, c.escolha, q.correta); renderCard(e.id); atualizarEstatisticas(); }
        else if (alvo.hasAttribute('data-qb-refazer')) { c.escolha = null; c.respondida = false; renderCard(e.id); }
        else if (alvo.hasAttribute('data-qb-resolver')) pedirResolucao(e);
    });
    document.addEventListener('change', event => {
        const t = event.target;
        if (!t.closest?.('#questoesBanco')) return;
        if (t.matches('[data-qb-tema]')) return aplicar(f => { const k = t.dataset.qbTema; f.temas = alternar(f.temas, k); f.subs = f.subs.filter(s => !s.startsWith(`${k}.`)); f.ids = []; estado.abertos[k] = true; });
        if (t.matches('[data-qb-sub]')) return aplicar(f => { f.subs = alternar(f.subs, t.dataset.qbSub); f.ids = []; });
        if (t.matches('[data-qb-gen-materia]')) { estado.geradorMateria = t.value; return; }
        if (t.matches('select[data-qb-f]')) aplicar(f => { f[t.dataset.qbF] = t.value; if (t.dataset.qbF === 'ordem' && t.value === 'aleatoria') f.semente = String(Math.random()); if (t.dataset.qbF !== 'ordem') f.ids = []; });
    });
    // Foto ilustrativa que não carregou: some do cartão.
    document.addEventListener('error', event => { if (event.target?.matches?.('#questoesBanco img[data-qb-foto]')) event.target.closest('.qb-figure')?.remove(); }, true);
    window.addEventListener('king-master-section', event => { if (event.detail === 'question-timer') { montar(); render(); } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once: true }); else montar();

    window.KingQuestoesBanco = Object.freeze({ markdown, textoPlano, textoIa, normalizarEnem, normalizarVestibular, normalizarBluex, filtrar, contarAssuntos, discDaMateria, desempenho, origemDe, mostrarAba });
})();

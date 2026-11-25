/* Banco de questões da aba Questões.
   - ENEM: questões reais (2009–2023) da API aberta enem.dev, com gabarito oficial.
   - Vestibulares: questões originais criadas pela IA no estilo da prova escolhida (ENEM, FUVEST, UNICAMP, UNESP, UERJ), com nível.
   Ao terminar um bloco, o resultado vai para o histórico (e conta nas metas). */
(() => {
    'use strict';
    const API = 'https://api.enem.dev/v1';
    const ANOS = Array.from({ length: 15 }, (_, i) => 2023 - i);
    const AREAS = {
        linguagens: { nome: 'Linguagens', api: 'linguagens', offset: 0, cor: '#d9480f' },
        humanas: { nome: 'Humanas', api: 'ciencias-humanas', offset: 45, cor: '#9c36b5' },
        natureza: { nome: 'Natureza', api: 'ciencias-natureza', offset: 90, cor: '#2f9e44' },
        matematica: { nome: 'Matemática', api: 'matematica', offset: 135, cor: '#1c7ed6' },
    };
    const AREA_POR_API = Object.fromEntries(Object.entries(AREAS).map(([id, a]) => [a.api, id]));
    const BANCAS = ['ENEM', 'FUVEST', 'UNICAMP', 'UNESP', 'UERJ'];
    const NIVEIS = { basico: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    const LETRAS = 'ABCDE';

    const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const urlImagem = u => /^https:\/\/enem\.dev\/[^\s"'<>)]+$/.test(String(u || '')) && !/broken-image/.test(u) ? String(u) : '';
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (m, e) => window.showToast?.(m, e);
    const formatar = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const embaralhar = lista => { const a = [...lista]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

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

    // Converte uma questão da API enem.dev para o formato do banco.
    function normalizarEnem(q) {
        const area = AREA_POR_API[q?.discipline];
        const alternativas = (Array.isArray(q?.alternatives) ? q.alternatives : []).map(a => ({ letra: String(a.letter || ''), texto: String(a.text || ''), imagem: urlImagem(a.file) }));
        const correta = LETRAS.indexOf(String(q?.correctAlternative || '').toUpperCase());
        if (!area || alternativas.length !== 5 || correta < 0) return null;
        return {
            id: `enem-${q.year}-${q.index}${q.language ? `-${q.language}` : ''}`, fonte: 'enem', ano: Number(q.year), numero: Number(q.index), area,
            contexto: String(q.context || ''), introducao: String(q.alternativesIntroduction || ''), alternativas, correta,
            arquivos: (Array.isArray(q.files) ? q.files : []).map(urlImagem).filter(Boolean),
        };
    }

    function normalizarIa(q, banca, nivel, i) {
        return {
            id: `ia-${Date.now().toString(36)}-${i}`, fonte: 'ia', banca, nivel, materia: q.subject, assunto: q.topic,
            contexto: q.stem, introducao: '', alternativas: q.choices.map((texto, k) => ({ letra: LETRAS[k], texto, imagem: '' })), correta: q.correctIndex, explicacao: q.explanation,
        };
    }

    function resumir(questoes, respostas) {
        let acertos = 0, erros = 0, puladas = 0, segundos = 0;
        const porArea = {};
        questoes.forEach((q, i) => {
            const r = respostas[i];
            segundos += Number(r?.segundos) || 0;
            const chave = q.fonte === 'enem' ? AREAS[q.area]?.nome : q.materia;
            const linha = porArea[chave] ||= { acertos: 0, total: 0 };
            if (!r || r.escolha === null || r.escolha === undefined) { puladas++; return; }
            linha.total++;
            if (r.escolha === q.correta) { acertos++; linha.acertos++; } else erros++;
        });
        const respondidas = acertos + erros;
        return { total: questoes.length, acertos, erros, puladas, respondidas, segundos, percentual: respondidas ? Math.round(acertos / respondidas * 100) : 0, porArea };
    }

    // ----- Estado -----
    const banco = () => {
        const d = dados();
        if (!d.bancoQuestoes || typeof d.bancoQuestoes !== 'object') d.bancoQuestoes = { respondidas: {}, blocos: [] };
        if (!d.bancoQuestoes.respondidas || typeof d.bancoQuestoes.respondidas !== 'object') d.bancoQuestoes.respondidas = {};
        if (!Array.isArray(d.bancoQuestoes.blocos)) d.bancoQuestoes.blocos = [];
        return d.bancoQuestoes;
    };
    const estado = { fonte: 'enem', area: '', ano: '', lingua: 'ingles', qtd: 10, evitarFeitas: true, banca: 'ENEM', nivel: 'medio', materiaId: '', assunto: '', qtdIa: 5,
        fase: 'config', questoes: [], respostas: [], indice: 0, escolhida: null, inicio: 0, carregando: false, pedido: 0, salvo: false };
    let relogio = null;
    const cacheProvas = new Map();

    async function buscarPagina(ano, offset, lingua) {
        const chave = `${ano}:${offset}:${lingua}`;
        if (cacheProvas.has(chave)) return cacheProvas.get(chave);
        const resposta = await fetch(`${API}/exams/${ano}/questions?limit=50&offset=${offset}&language=${encodeURIComponent(lingua)}`);
        if (resposta.status === 429) throw new Error('O banco do ENEM pediu uma pausa. Espere alguns segundos e tente de novo.');
        if (!resposta.ok) throw new Error('O banco de questões do ENEM não respondeu agora. Tente de novo.');
        const corpo = await resposta.json();
        const lista = (Array.isArray(corpo?.questions) ? corpo.questions : []).map(normalizarEnem).filter(Boolean);
        cacheProvas.set(chave, lista);
        return lista;
    }

    async function carregarEnem() {
        const areas = estado.area ? [estado.area] : Object.keys(AREAS);
        const anos = estado.ano ? [Number(estado.ano)] : embaralhar(ANOS).slice(0, 3);
        const feitas = banco().respondidas;
        // Busca as provas ao mesmo tempo (a API aceita poucas chamadas por vez, então no máximo 6).
        const pedidos = anos.flatMap(ano => areas.map(area => ({ ano, area }))).slice(0, 6);
        const paginas = await Promise.all(pedidos.map(p => buscarPagina(p.ano, AREAS[p.area].offset, estado.lingua).then(lista => ({ ...p, lista }))));
        const candidatas = paginas.flatMap(p => p.lista.filter(q => q.area === p.area && (!estado.evitarFeitas || !feitas[q.id])));
        // Distribui entre as áreas escolhidas e embaralha.
        const porArea = areas.map(a => embaralhar(candidatas.filter(q => q.area === a)));
        const escolhidas = [];
        while (escolhidas.length < estado.qtd && porArea.some(l => l.length)) porArea.forEach(l => { if (l.length && escolhidas.length < estado.qtd) escolhidas.push(l.shift()); });
        if (!escolhidas.length) throw new Error(estado.evitarFeitas ? 'Você já fez todas as questões desse filtro. Desmarque "Evitar questões que já fiz" ou mude o ano.' : 'Não achei questões com esse filtro.');
        return embaralhar(escolhidas);
    }

    async function carregarIa() {
        const materia = (dados().cycleItems || []).find(m => String(m.id) === String(estado.materiaId));
        if (!materia) throw new Error('Escolha a matéria das questões.');
        await window.kingGeminiReady;
        if (!window.kingGemini?.generateMockQuestions) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
        const lista = await window.kingGemini.generateMockQuestions({ subjects: [materia.subject], topics: estado.assunto ? [estado.assunto] : [], count: estado.qtdIa, level: estado.nivel, banca: estado.banca, banco: true });
        if (!lista.length) throw new Error('A IA não trouxe questões válidas. Tente de novo ou mude o assunto.');
        return lista.map((q, i) => normalizarIa(q, estado.banca, estado.nivel, i));
    }

    async function comecar() {
        if (estado.carregando) return;
        estado.carregando = true; const pedido = ++estado.pedido;
        render();
        try {
            const questoes = estado.fonte === 'enem' ? await carregarEnem() : await carregarIa();
            if (pedido !== estado.pedido) return;
            Object.assign(estado, { fase: 'resolvendo', questoes, respostas: questoes.map(() => null), indice: 0, escolhida: null, inicio: Date.now(), salvo: false });
            iniciarRelogio();
        } catch (error) {
            toast(error?.message || 'Não foi possível montar o bloco de questões.', true);
        } finally {
            if (pedido === estado.pedido) { estado.carregando = false; render(); }
        }
    }

    function iniciarRelogio() {
        clearInterval(relogio);
        relogio = setInterval(() => {
            const el = document.getElementById('qbClock');
            if (el && estado.fase === 'resolvendo' && !estado.respostas[estado.indice]) el.textContent = formatar(Math.floor((Date.now() - estado.inicio) / 1000));
        }, 1000);
    }

    function responder(pular = false) {
        const i = estado.indice;
        if (estado.respostas[i]) return;
        if (!pular && estado.escolhida === null) return toast('Escolha uma alternativa.', true);
        const segundos = Math.max(0, Math.round((Date.now() - estado.inicio) / 1000));
        estado.respostas[i] = { escolha: pular ? null : estado.escolhida, segundos };
        const q = estado.questoes[i];
        if (!pular) banco().respondidas[q.id] = { ok: estado.escolhida === q.correta, em: Date.now(), fonte: q.fonte, area: q.area || q.materia || '' };
        if (pular) return proxima();
        render();
    }

    function proxima() {
        if (estado.indice + 1 >= estado.questoes.length) return finalizar();
        estado.indice += 1; estado.escolhida = null; estado.inicio = Date.now();
        render();
    }

    function finalizar() {
        clearInterval(relogio);
        estado.fase = 'resumo';
        salvarBloco();
        render();
    }

    // Registra o bloco: estatística do banco, histórico (para as metas) e a matéria, nas questões da IA.
    function salvarBloco() {
        if (estado.salvo) return;
        const r = resumir(estado.questoes, estado.respostas);
        if (!r.respondidas) { estado.salvo = true; return; }
        estado.salvo = true;
        const d = dados();
        const q0 = estado.questoes[0];
        const titulo = q0.fonte === 'enem' ? `Questões ENEM${estado.area ? ` · ${AREAS[estado.area].nome}` : ''}` : `${q0.materia} · estilo ${q0.banca}`;
        banco().blocos = [{ em: Date.now(), fonte: q0.fonte, titulo, total: r.respondidas, acertos: r.acertos, segundos: r.segundos }, ...banco().blocos].slice(0, 60);
        let materia = null;
        if (q0.fonte === 'ia') {
            materia = (d.cycleItems || []).find(m => m.subject === q0.materia) || null;
            if (materia) { materia.questoes = (Number(materia.questoes) || 0) + r.respondidas; materia.acertos = (Number(materia.acertos) || 0) + r.acertos; materia.erros = (Number(materia.erros) || 0) + r.erros; }
        }
        if (typeof criarItemHistoricoRegistro === 'function' && Array.isArray(d.historyItems)) {
            const item = criarItemHistoricoRegistro({ segundos: 0, materia: materia ? materia.subject : titulo, assunto: q0.fonte === 'enem' ? 'Banco de questões do ENEM' : (estado.assunto || 'Banco de questões'), cor: materia?.color || (q0.fonte === 'enem' ? '#2563eb' : '#6d28d9'), tipo: 'Estudo', comentario: `${r.acertos} de ${r.respondidas} acertos em ${formatar(r.segundos)}.`, atividade: 'estudo' });
            Object.assign(item, { questoes: r.respondidas, acertos: r.acertos, erros: r.erros, subjectId: materia?.id || '', origem: 'banco-questoes' });
            d.historyItems.push(item);
        }
        window.saveAppData?.();
        if (typeof renderizarCiclo === 'function') try { renderizarCiclo(); } catch { /* a tela de matérias se atualiza depois */ }
    }

    function sair() {
        if (estado.fase === 'resolvendo' && estado.respostas.some(Boolean) && !window.confirm('Encerrar o bloco agora? As questões respondidas serão salvas.')) return;
        if (estado.fase === 'resolvendo') { finalizar(); return; }
        estado.fase = 'config'; estado.questoes = []; render();
    }

    // ----- Interface -----
    function estatisticas() {
        const resp = Object.values(banco().respondidas);
        const ok = resp.filter(r => r.ok).length;
        return { feitas: resp.length, percentual: resp.length ? Math.round(ok / resp.length * 100) : 0 };
    }

    function chips(lista, atual, atributo) {
        return lista.map(([valor, rotulo]) => `<button type="button" class="qb-chip" data-${atributo}="${esc(valor)}" aria-pressed="${String(valor) === String(atual)}">${esc(rotulo)}</button>`).join('');
    }

    function htmlConfig() {
        const st = estatisticas();
        const materias = dados().cycleItems || [];
        const materiaAtual = materias.find(m => String(m.id) === String(estado.materiaId));
        const topicos = materiaAtual?.topicos || [];
        const enem = `
            <div class="qb-field"><span class="qb-label">Área</span><div class="qb-chips">${chips([['', 'Todas'], ...Object.entries(AREAS).map(([id, a]) => [id, a.nome])], estado.area, 'qb-area')}</div></div>
            <div class="qb-row">
                <label class="qb-field"><span class="qb-label">Ano da prova</span><select class="cycle-input" data-qb-ano><option value="">Todos os anos</option>${ANOS.map(a => `<option value="${a}"${String(a) === String(estado.ano) ? ' selected' : ''}>${a}</option>`).join('')}</select></label>
                <label class="qb-field"><span class="qb-label">Língua estrangeira</span><select class="cycle-input" data-qb-lingua><option value="ingles"${estado.lingua === 'ingles' ? ' selected' : ''}>Inglês</option><option value="espanhol"${estado.lingua === 'espanhol' ? ' selected' : ''}>Espanhol</option></select></label>
            </div>
            <div class="qb-field"><span class="qb-label">Quantidade</span><div class="qb-segment">${chips([[5, '5'], [10, '10'], [15, '15'], [20, '20']], estado.qtd, 'qb-qtd')}</div></div>
            <label class="qb-check"><input type="checkbox" data-qb-evitar${estado.evitarFeitas ? ' checked' : ''}> Evitar questões que já fiz</label>`;
        const ia = `
            <div class="qb-row">
                <label class="qb-field"><span class="qb-label">Matéria</span><select class="cycle-input" data-qb-materia><option value="">Escolha a matéria</option>${materias.map(m => `<option value="${esc(m.id)}"${String(m.id) === String(estado.materiaId) ? ' selected' : ''}>${esc(m.subject)}</option>`).join('')}</select></label>
                <label class="qb-field"><span class="qb-label">Assunto <small>opcional</small></span><input class="cycle-input" data-qb-assunto list="qbTopicos" maxlength="100" placeholder="Ex.: Genética" value="${esc(estado.assunto)}"><datalist id="qbTopicos">${topicos.map(t => `<option value="${esc(t.nome)}"></option>`).join('')}</datalist></label>
            </div>
            <div class="qb-field"><span class="qb-label">Estilo de prova</span><div class="qb-chips">${chips(BANCAS.map(b => [b, b]), estado.banca, 'qb-banca')}</div></div>
            <div class="qb-field"><span class="qb-label">Nível</span><div class="qb-segment">${chips(Object.entries(NIVEIS), estado.nivel, 'qb-nivel')}</div></div>
            <div class="qb-field"><span class="qb-label">Quantidade</span><div class="qb-segment">${chips([[3, '3'], [5, '5'], [8, '8'], [10, '10']], estado.qtdIa, 'qb-qtdia')}</div></div>
            <p class="qb-hint">Questões originais criadas pela IA no estilo da prova escolhida, com explicação de cada resposta. Não são questões reais dessas provas.</p>`;
        return `<section class="widget qb-card">
            <header class="qb-head"><div><span class="workspace-kicker">BANCO DE QUESTÕES</span><h2>Monte seu bloco de questões</h2><p>Questões reais do ENEM ou questões de vestibular criadas pela IA, com correção na hora.</p></div>
                <dl class="qb-stats"><div><dt>Feitas</dt><dd>${st.feitas}</dd></div><div><dt>Acerto</dt><dd>${st.feitas ? `${st.percentual}%` : '—'}</dd></div></dl></header>
            <div class="qb-source" role="tablist" aria-label="Origem das questões">
                <button type="button" role="tab" data-qb-fonte="enem" aria-selected="${estado.fonte === 'enem'}"><strong>ENEM</strong><small>Questões reais de 2009 a 2023</small></button>
                <button type="button" role="tab" data-qb-fonte="ia" aria-selected="${estado.fonte === 'ia'}"><strong>Vestibulares com IA</strong><small>ENEM, FUVEST, UNICAMP, UNESP e UERJ</small></button>
            </div>
            <div class="qb-form">${estado.fonte === 'enem' ? enem : ia}</div>
            <footer class="qb-foot"><button type="button" class="cycle-btn primary" data-qb-comecar${estado.carregando ? ' disabled' : ''}>${estado.carregando ? (estado.fonte === 'ia' ? 'Criando questões…' : 'Montando o bloco…') : 'Começar'}</button></footer>
        </section>${htmlHistorico()}`;
    }

    function htmlHistorico() {
        const blocos = banco().blocos.slice(0, 6);
        if (!blocos.length) return '';
        return `<section class="widget qb-card qb-history"><h3>Blocos recentes</h3><ul>${blocos.map(b => `<li><span>${esc(b.titulo)}</span><small>${new Date(b.em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</small><strong>${b.acertos}/${b.total}</strong></li>`).join('')}</ul></section>`;
    }

    function htmlQuestao() {
        const q = estado.questoes[estado.indice];
        const r = estado.respostas[estado.indice];
        const origem = q.fonte === 'enem' ? `ENEM ${q.ano} · questão ${q.numero} · ${AREAS[q.area].nome}` : `${esc(q.materia)} · estilo ${esc(q.banca)} · ${NIVEIS[q.nivel] || ''}`;
        const corpo = q.fonte === 'enem' ? markdown(q.contexto) : `<p>${esc(q.contexto)}</p>`;
        const alternativas = q.alternativas.map((a, k) => {
            const classes = ['qb-alt'];
            if (r) { if (k === q.correta) classes.push('is-correct'); else if (k === r.escolha) classes.push('is-wrong'); }
            else if (k === estado.escolhida) classes.push('is-selected');
            const conteudo = a.imagem ? `<img src="${esc(a.imagem)}" alt="Alternativa ${a.letra}" loading="lazy">` : esc(a.texto);
            return `<button type="button" class="${classes.join(' ')}" data-qb-alt="${k}"${r ? ' disabled' : ''}><span class="qb-letter">${a.letra}</span><span class="qb-alt-text">${conteudo}</span></button>`;
        }).join('');
        const acertou = r && r.escolha === q.correta;
        const feedback = r ? `<div class="qb-feedback ${acertou ? 'ok' : 'bad'}"><strong>${acertou ? '✓ Você acertou!' : `✗ Resposta certa: ${LETRAS[q.correta]}`}</strong>${q.explicacao ? `<p>${esc(q.explicacao)}</p>` : q.fonte === 'enem' ? '<p>Gabarito oficial do Inep.</p>' : ''}</div>` : '';
        const acoes = r
            ? `<button type="button" class="cycle-btn primary" data-qb-proxima>${estado.indice + 1 >= estado.questoes.length ? 'Ver resultado' : 'Próxima questão →'}</button>`
            : `<button type="button" class="cycle-btn" data-qb-pular>Pular</button><button type="button" class="cycle-btn primary" data-qb-responder${estado.escolhida === null ? ' disabled' : ''}>Responder</button>`;
        const progresso = Math.round(estado.indice / estado.questoes.length * 100);
        return `<section class="widget qb-card qb-solve">
            <header class="qb-solve-head"><div><span class="qb-origin">${origem}</span><strong>Questão ${estado.indice + 1} de ${estado.questoes.length}</strong></div>
                <div class="qb-solve-tools"><span class="qb-clock" id="qbClock">${formatar(r ? r.segundos : Math.floor((Date.now() - estado.inicio) / 1000))}</span><button type="button" class="cycle-btn" data-qb-sair>Encerrar</button></div></header>
            <div class="qb-progress"><span style="width:${progresso}%"></span></div>
            <article class="qb-question">${corpo}${q.introducao ? `<p class="qb-intro">${esc(q.introducao)}</p>` : ''}</article>
            <div class="qb-alts" role="group" aria-label="Alternativas">${alternativas}</div>
            ${feedback}
            <footer class="qb-foot">${acoes}</footer>
        </section>`;
    }

    function htmlResumo() {
        const r = resumir(estado.questoes, estado.respostas);
        const linhas = Object.entries(r.porArea).filter(([, v]) => v.total).map(([nome, v]) => `<li><span>${esc(nome)}</span><strong>${v.acertos}/${v.total}</strong></li>`).join('');
        const erradas = estado.questoes.map((q, i) => ({ q, i, r: estado.respostas[i] })).filter(x => x.r && x.r.escolha !== null && x.r.escolha !== x.q.correta);
        return `<section class="widget qb-card qb-summary">
            <span class="workspace-kicker">BLOCO CONCLUÍDO</span>
            <h2>${r.acertos} de ${r.respondidas} acertos</h2>
            <p>${r.percentual}% de acerto · ${r.puladas} pulada${r.puladas === 1 ? '' : 's'} · média de ${formatar(r.respondidas ? Math.round(r.segundos / Math.max(1, r.respondidas)) : 0)} por questão</p>
            ${linhas ? `<ul class="qb-areas">${linhas}</ul>` : ''}
            ${erradas.length ? `<div class="qb-review"><strong>Rever os erros</strong><div>${erradas.map(x => `<button type="button" class="qb-chip" data-qb-rever="${x.i}">Questão ${x.i + 1}</button>`).join('')}</div></div>` : ''}
            <p class="qb-hint">${r.respondidas ? 'O resultado foi salvo no seu histórico e conta nas suas metas de questões.' : 'Nenhuma questão respondida, então nada foi salvo.'}</p>
            <footer class="qb-foot"><button type="button" class="cycle-btn" data-qb-config>Mudar filtros</button><button type="button" class="cycle-btn primary" data-qb-novo>Novo bloco</button></footer>
        </section>`;
    }

    function render() {
        const box = document.getElementById('questoesBanco');
        if (!box) return;
        box.innerHTML = estado.fase === 'resolvendo' ? htmlQuestao() : estado.fase === 'resumo' ? htmlResumo() : htmlConfig();
    }

    // Abas da seção Questões: Banco de questões | Tempo por questão.
    function montar() {
        const secao = document.getElementById('question-timer');
        if (!secao || document.getElementById('questoesBanco')) return;
        const heading = secao.querySelector('.workspace-heading');
        if (heading) {
            const kicker = heading.querySelector('.workspace-kicker'); if (kicker) kicker.textContent = 'TREINO DE PROVA';
            const h1 = heading.querySelector('h1'); if (h1) h1.textContent = 'Questões';
            const p = heading.querySelector('p'); if (p) p.textContent = 'Resolva questões reais do ENEM ou de vestibular criadas pela IA, ou cronometre questões que você faz em outro lugar.';
            heading.querySelectorAll(':scope > :not(div:first-child)').forEach(el => { if (/sem ia/i.test(el.textContent || '')) el.hidden = true; });
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
        if (d.qbFonte) { estado.fonte = d.qbFonte; render(); }
        else if (d.qbArea !== undefined) { estado.area = d.qbArea; render(); }
        else if (d.qbQtd) { estado.qtd = Number(d.qbQtd); render(); }
        else if (d.qbBanca) { estado.banca = d.qbBanca; render(); }
        else if (d.qbNivel) { estado.nivel = d.qbNivel; render(); }
        else if (d.qbQtdia) { estado.qtdIa = Number(d.qbQtdia); render(); }
        else if (alvo.hasAttribute('data-qb-comecar') || alvo.hasAttribute('data-qb-novo')) comecar();
        else if (d.qbAlt !== undefined) { if (!estado.respostas[estado.indice]) { estado.escolhida = Number(d.qbAlt); render(); } }
        else if (alvo.hasAttribute('data-qb-responder')) responder();
        else if (alvo.hasAttribute('data-qb-pular')) responder(true);
        else if (alvo.hasAttribute('data-qb-proxima')) proxima();
        else if (alvo.hasAttribute('data-qb-sair')) sair();
        else if (alvo.hasAttribute('data-qb-config')) { estado.fase = 'config'; render(); }
        else if (d.qbRever !== undefined) { estado.fase = 'resolvendo'; estado.indice = Number(d.qbRever); render(); }
    });
    document.addEventListener('change', event => {
        const t = event.target;
        if (!t.closest?.('#questoesBanco')) return;
        if (t.matches('[data-qb-ano]')) estado.ano = t.value;
        else if (t.matches('[data-qb-lingua]')) estado.lingua = t.value;
        else if (t.matches('[data-qb-evitar]')) estado.evitarFeitas = t.checked;
        else if (t.matches('[data-qb-materia]')) { estado.materiaId = t.value; estado.assunto = ''; render(); }
    });
    document.addEventListener('input', event => {
        if (event.target.matches?.('#questoesBanco [data-qb-assunto]')) estado.assunto = event.target.value.trim().slice(0, 100);
    });
    window.addEventListener('king-master-section', event => { if (event.detail === 'question-timer') { montar(); if (estado.fase === 'config') render(); } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar, { once: true }); else montar();

    window.KingQuestoesBanco = Object.freeze({ markdown, normalizarEnem, resumir, mostrarAba, AREAS });
})();

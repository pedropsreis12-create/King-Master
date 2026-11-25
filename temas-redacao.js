/* Banco de temas de redação: temas oficiais do ENEM + temas gerados pela IA.
   Um tema fica concluído quando existe uma redação registrada com o mesmo tema. */
(() => {
    'use strict';
    const OFICIAIS = [
        [2024, 'Desafios para a valorização da herança africana no Brasil', 'Cultura'],
        [2023, 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil', 'Trabalho'],
        [2022, 'Desafios para a valorização de comunidades e povos tradicionais no Brasil', 'Cultura'],
        [2021, 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil', 'Cidadania'],
        [2020, 'O estigma associado às doenças mentais na sociedade brasileira', 'Saúde'],
        [2019, 'Democratização do acesso ao cinema no Brasil', 'Cultura'],
        [2018, 'Manipulação do comportamento do usuário pelo controle de dados na internet', 'Tecnologia'],
        [2017, 'Desafios para a formação educacional de surdos no Brasil', 'Educação'],
        [2016, 'Caminhos para combater a intolerância religiosa no Brasil', 'Cidadania'],
        [2015, 'A persistência da violência contra a mulher na sociedade brasileira', 'Segurança'],
        [2014, 'Publicidade infantil em questão no Brasil', 'Cidadania'],
        [2013, 'Efeitos da implantação da Lei Seca no Brasil', 'Segurança'],
    ];
    const EIXOS = ['Educação', 'Saúde', 'Meio ambiente', 'Tecnologia', 'Cidadania', 'Cultura', 'Trabalho', 'Segurança', 'Desigualdade', 'Mobilidade'];
    const ARTE = {
        'Educação': { cores: ['#4c6ef5', '#22b8cf'], icone: '<path d="M4 9.5 12 5l8 4.5-8 4.5z"/><path d="M7.5 11.5v4c1.2 1.4 2.7 2 4.5 2s3.3-.6 4.5-2v-4M20 9.5v5"/>' },
        'Saúde': { cores: ['#e03131', '#f783ac'], icone: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/><path d="M8.5 12h2l1-2 1.5 4 1-2h1.5"/>' },
        'Meio ambiente': { cores: ['#2b8a3e', '#94d82d'], icone: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19 13 11"/>' },
        'Tecnologia': { cores: ['#5f3dc4', '#4dabf7'], icone: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M9 20h6M12 16v4M8 9l2 2-2 2M12.5 13H16"/>' },
        'Cidadania': { cores: ['#1971c2', '#63e6be'], icone: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.1A4.5 4.5 0 0 1 21 18.5"/>' },
        'Cultura': { cores: ['#e8590c', '#fcc419'], icone: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>' },
        'Trabalho': { cores: ['#495057', '#f59f00'], icone: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17"/>' },
        'Segurança': { cores: ['#364fc7', '#748ffc'], icone: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>' },
        'Desigualdade': { cores: ['#a61e4d', '#ff8787'], icone: '<path d="M12 4v16M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>' },
        'Mobilidade': { cores: ['#0b7285', '#66d9e8'], icone: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14M8 20l1.5-3M16 20l-1.5-3"/><circle cx="8.5" cy="14" r=".8"/><circle cx="15.5" cy="14" r=".8"/>' },
    };
    const ARTE_PADRAO = { cores: ['#5c7cfa', '#cc5de8'], icone: '<path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3"/>' };
    const semente = texto => [...String(texto)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

    function ilustracao(tema) {
        const arte = ARTE[tema.eixo] || ARTE_PADRAO;
        const h = semente(tema.titulo);
        const [a, b] = arte.cores;
        const id = `g${h.toString(36)}`;
        const bolhas = [0, 1, 2, 3].map(i => {
            const x = (h >> (i * 5)) % 320, y = (h >> (i * 3 + 2)) % 150, r = 24 + ((h >> (i * 4)) % 46);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(0.07 + i * 0.03).toFixed(2)}"/>`;
        }).join('');
        const giro = (h % 50) - 25;
        return `<svg class="tema-art" viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
            <rect width="320" height="150" fill="url(#${id})"/>${bolhas}
            <path d="M-20 ${110 + (h % 25)} C 80 ${70 + (h % 40)}, 200 ${150 - (h % 30)}, 340 ${95 + (h % 30)} L340 170 L-20 170 Z" fill="#fff" opacity=".12"/>
            <g transform="translate(212 34) rotate(${giro} 40 40) scale(3.4)" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".92">${arte.icone}</g>
        </svg>`;
    }

    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (msg, erro) => window.showToast?.(msg, erro);
    let filtro = 'afazer', eixoFiltro = '', busca = '', gerando = null;
    const MAX_GERAR = 20;

    function banco() {
        const d = dados();
        if (!Array.isArray(d.temasRedacao)) d.temasRedacao = [];
        return d.temasRedacao;
    }

    function todos() {
        const proprios = banco();
        const chaves = new Set(proprios.map(t => norm(t.titulo)));
        const oficiais = OFICIAIS.filter(([, titulo]) => !chaves.has(norm(titulo))).map(([ano, titulo, eixo]) => ({ id: `enem-${ano}`, titulo, eixo, origem: 'enem', ano }));
        return [...proprios, ...oficiais];
    }

    function redacaoDoTema(tema) {
        const chave = norm(tema.titulo);
        const lista = (dados().redacaoItems || []).filter(item => norm(item.theme) === chave);
        return lista.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
    }

    const notaTotal = r => ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((t, k) => t + (Number(r[k]) || 0), 0);
    const dataBr = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replaceAll('.', '') : '';

    const LAPIS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3"/></svg>';
    function cartao(tema) {
        const red = redacaoDoTema(tema);
        const selo = tema.origem === 'enem' ? `ENEM ${esc(tema.ano)}` : '✦ IA';
        const nota = red && red.status === 'corrected' && notaTotal(red) ? ` · nota ${notaTotal(red)}` : red && red.status !== 'corrected' ? ' · aguardando correção' : '';
        const rodape = red
            ? `<span class="tema-card-done">✓ Concluído${red.date ? ` em ${esc(dataBr(red.date))}` : ''}${nota}</span><button type="button" class="tema-card-again" data-escrever="${esc(tema.id)}">Escrever de novo</button>`
            : `<button type="button" class="tema-card-write" data-escrever="${esc(tema.id)}">${LAPIS}<span>Escrever sobre este tema</span><b aria-hidden="true">→</b></button>`;
        const apagar = tema.origem === 'enem' ? '' : `<button type="button" class="tema-card-remove" data-apagar-tema="${esc(tema.id)}" aria-label="Remover tema" title="Remover tema">×</button>`;
        return `<li class="tema-card${red ? ' is-done' : ''}">
            <div class="tema-card-art">${ilustracao(tema)}<span class="tema-card-badge${tema.origem === 'enem' ? '' : ' is-ia'}">${selo}</span>${tema.eixo ? `<span class="tema-card-eixo">${esc(tema.eixo)}</span>` : ''}${apagar}</div>
            <div class="tema-card-body"><h3>${esc(tema.titulo)}</h3>${tema.recorte ? `<p>${esc(tema.recorte)}</p>` : ''}<div class="tema-card-foot">${rodape}</div></div>
        </li>`;
    }

    function render() {
        const box = document.getElementById('enemWritingTools');
        if (!box) return;
        const lista = todos();
        const concluidos = lista.filter(t => redacaoDoTema(t)).length;
        if (!box.dataset.ready) {
            box.dataset.ready = '1';
            box.innerHTML = `<section class="tema-bank" aria-labelledby="temaBankTitle">
                <header class="tema-bank-hero"><span class="tema-bank-mark" aria-hidden="true">${LAPIS}</span><div><h2 id="temaBankTitle">Qual tema você vai escrever hoje?</h2>
                    <p>Escolha uma proposta, escreva sua dissertação-argumentativa e registre a redação. O tema fica concluído na hora.</p>
                    <div class="tema-bank-actions"><button type="button" class="tema-bank-btn primary" data-gerar-temas>✦ Gerar temas com IA</button><button type="button" class="tema-bank-btn" data-red-tab="redacoes">↺ Minhas redações</button></div></div></header>
                <p class="tema-bank-count" id="temaBankCount"></p>
                <div class="tema-progress"><span id="temaBankBar"></span></div>
                <div class="tema-toolbar"><div class="enem-area-chips" role="group" aria-label="Filtrar temas"><button type="button" data-tema-filtro="afazer">A fazer</button><button type="button" data-tema-filtro="concluidos">Concluídos</button><button type="button" data-tema-filtro="todos">Todos</button></div>
                    <select class="cycle-input" data-tema-eixo aria-label="Filtrar por eixo"><option value="">Todos os eixos</option>${EIXOS.map(e => `<option>${esc(e)}</option>`).join('')}</select>
                    <input type="search" class="cycle-input" data-tema-busca placeholder="Buscar tema" aria-label="Buscar tema"></div>
                <ul class="tema-grid" id="temaBankList" aria-live="polite"></ul>
            </section>`;
        }
        document.getElementById('temaBankCount').textContent = `${lista.length} ${lista.length === 1 ? 'tema' : 'temas'} · ${concluidos} ${concluidos === 1 ? 'concluído' : 'concluídos'}. Um tema fica concluído quando você registra uma redação com ele.`;
        document.getElementById('temaBankBar').style.width = `${lista.length ? Math.round(concluidos / lista.length * 100) : 0}%`;
        box.querySelectorAll('[data-tema-filtro]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.temaFiltro === filtro)));
        const visiveis = lista.filter(t => {
            const feito = Boolean(redacaoDoTema(t));
            if (filtro === 'afazer' && feito) return false;
            if (filtro === 'concluidos' && !feito) return false;
            if (eixoFiltro && norm(t.eixo) !== norm(eixoFiltro)) return false;
            if (busca && !norm(t.titulo).includes(norm(busca))) return false;
            return true;
        });
        const ul = document.getElementById('temaBankList');
        ul.innerHTML = visiveis.length ? visiveis.map(cartao).join('') : `<li class="tema-empty">${filtro === 'concluidos' ? 'Nenhum tema concluído ainda. Escreva sobre um tema e registre a redação.' : 'Nenhum tema aqui. Gere novos temas com a IA.'}</li>`;
    }

    function escrever(id) {
        const tema = todos().find(t => t.id === id);
        if (!tema) return;
        window.abrirModalRedacao?.();
        setTimeout(() => {
            const campo = document.getElementById('redTheme');
            if (campo) { campo.value = tema.titulo; campo.dispatchEvent(new Event('input', { bubbles: true })); }
        }, 60);
    }

    function abrirGerador() {
        document.getElementById('temaGenModal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay enem-tool-modal';
        overlay.id = 'temaGenModal';
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'temaGenTitle');
        overlay.innerHTML = `<div class="modal-box"><button type="button" class="modal-close" data-close aria-label="Fechar">×</button>
            <span class="workspace-kicker">BANCO DE TEMAS</span><h2 id="temaGenTitle">Gerar temas com IA</h2>
            <p class="enem-tool-intro">A IA cria temas originais no estilo do ENEM, sem repetir os que você já tem. Você revisa antes de adicionar.</p>
            <div class="cycle-form-group tema-qtd" data-qtd-box><span class="cycle-label" id="temaQtdLabel">Quantos temas (até ${MAX_GERAR})</span>
                <div class="tema-qtd-row"><button type="button" data-qtd-step="-1" aria-label="Menos um tema">−</button><input type="number" class="cycle-input" data-qtd min="1" max="${MAX_GERAR}" value="10" inputmode="numeric" aria-labelledby="temaQtdLabel"><button type="button" data-qtd-step="1" aria-label="Mais um tema">+</button>
                <input type="range" data-qtd-range min="1" max="${MAX_GERAR}" value="10" aria-label="Quantidade de temas"></div></div>
            <fieldset class="tema-eixos"><legend>Eixos (deixe vazio para variar)</legend>${EIXOS.map(e => `<label><input type="checkbox" value="${esc(e)}"> ${esc(e)}</label>`).join('')}</fieldset>
            <div data-preview></div>
            <p class="enem-tool-intro" data-status role="status"></p>
            <div class="enem-tool-actions"><button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-go>Gerar temas</button></div></div>`;
        document.body.append(overlay);
        const fechar = () => { gerando?.abort(); gerando = null; overlay.remove(); };
        overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-close]')) fechar(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') fechar(); });
        const qtd = overlay.querySelector('[data-qtd]');
        const faixa = overlay.querySelector('[data-qtd-range]');
        const quantidade = () => Math.max(1, Math.min(MAX_GERAR, Math.round(Number(qtd.value) || 1)));
        const sincronizar = valor => { const v = Math.max(1, Math.min(MAX_GERAR, Math.round(Number(valor) || 1))); qtd.value = v; faixa.value = v; botao.textContent = candidatos ? botao.textContent : `Gerar ${v} ${v === 1 ? 'tema' : 'temas'}`; };
        overlay.addEventListener('click', event => { const passo = event.target.closest('[data-qtd-step]'); if (passo) sincronizar(quantidade() + Number(passo.dataset.qtdStep)); });
        faixa.addEventListener('input', () => sincronizar(faixa.value));
        qtd.addEventListener('change', () => sincronizar(qtd.value));
        qtd.addEventListener('input', () => { if (qtd.value !== '') faixa.value = quantidade(); });
        const botao = overlay.querySelector('[data-go]');
        const status = overlay.querySelector('[data-status]');
        let candidatos = null;
        botao.addEventListener('click', async () => {
            if (candidatos) {
                const escolhidos = [...overlay.querySelectorAll('[data-candidato]:checked')].map(i => candidatos[Number(i.dataset.candidato)]);
                if (!escolhidos.length) return toast('Marque ao menos um tema.', true);
                const agora = Date.now();
                banco().push(...escolhidos.map((t, i) => ({ id: `tema-${agora.toString(36)}-${i}`, titulo: t.titulo, eixo: EIXOS.find(e => norm(e) === norm(t.eixo)) || t.eixo, recorte: t.recorte, origem: 'ia', criadoEm: agora })));
                window.saveAppData?.();
                fechar();
                filtro = 'afazer';
                render();
                toast(`✦ ${escolhidos.length} temas adicionados ao banco.`);
                return;
            }
            botao.disabled = true; status.textContent = `Gerando ${quantidade()} ${quantidade() === 1 ? 'tema' : 'temas'}…`;
            try {
                await window.kingGeminiReady;
                if (!window.kingGemini?.generateEssayThemes) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
                gerando = new AbortController();
                const existentes = new Set(todos().map(t => norm(t.titulo)));
                const lista = await window.kingGemini.generateEssayThemes({
                    count: quantidade(),
                    eixos: [...overlay.querySelectorAll('.tema-eixos input:checked')].map(i => i.value),
                    avoid: todos().map(t => t.titulo), signal: gerando.signal,
                });
                candidatos = [];
                for (const t of lista) { const k = norm(t.titulo); if (!existentes.has(k)) { existentes.add(k); candidatos.push(t); } }
                if (!candidatos.length) throw new Error('A IA não trouxe temas novos. Tente de novo ou escolha outros eixos.');
                overlay.querySelector('.tema-eixos').hidden = true;
                overlay.querySelector('[data-qtd-box]').hidden = true;
                overlay.querySelector('[data-preview]').innerHTML = `<ul class="tema-preview">${candidatos.map((t, i) => `<li><label><input type="checkbox" data-candidato="${i}" checked><span><strong>${esc(t.titulo)}</strong><small>${esc(t.eixo)}${t.recorte ? ` · ${esc(t.recorte)}` : ''}</small></span></label></li>`).join('')}</ul>`;
                status.textContent = `${candidatos.length} temas novos. Desmarque os que não quiser.`;
                botao.textContent = 'Adicionar ao banco';
            } catch (error) {
                if (error?.name !== 'AbortError') status.textContent = error?.message || 'Não foi possível gerar os temas agora.';
            } finally {
                botao.disabled = false; gerando = null;
            }
        });
        sincronizar(10);
        requestAnimationFrame(() => overlay.classList.add('active'));
    }

    function mostrarAba(aba) {
        const secao = document.getElementById('redacao');
        if (!secao) return;
        const temas = aba === 'temas';
        secao.dataset.redView = temas ? 'temas' : 'redacoes';
        secao.querySelectorAll('[data-red-tab]').forEach(botao => botao.setAttribute('aria-selected', String(botao.dataset.redTab === secao.dataset.redView)));
        if (temas) render();
    }

    document.addEventListener('click', event => {
        const alvo = event.target.closest('button');
        if (alvo?.dataset.redTab) { mostrarAba(alvo.dataset.redTab); return; }
        if (!alvo || !alvo.closest('#enemWritingTools')) return;
        if (alvo.dataset.temaFiltro) { filtro = alvo.dataset.temaFiltro; render(); }
        else if (alvo.dataset.escrever) escrever(alvo.dataset.escrever);
        else if (alvo.hasAttribute('data-gerar-temas')) abrirGerador();
        else if (alvo.dataset.apagarTema) {
            const tema = banco().find(t => t.id === alvo.dataset.apagarTema);
            if (tema && window.confirm(`Remover o tema "${tema.titulo}" do banco? Suas redações continuam salvas.`)) {
                dados().temasRedacao = banco().filter(t => t.id !== tema.id);
                window.saveAppData?.(); render();
            }
        }
    });
    document.addEventListener('input', event => {
        if (event.target.matches?.('#enemWritingTools [data-tema-busca]')) { busca = event.target.value; render(); }
    });
    document.addEventListener('change', event => {
        if (event.target.matches?.('#enemWritingTools [data-tema-eixo]')) { eixoFiltro = event.target.value; render(); }
    });
    // Ao entrar na Redação, a tela abre nas redações; os temas só aparecem na aba própria.
    window.addEventListener('king-master-section', event => { if (event.detail === 'redacao') mostrarAba('redacoes'); });
    window.addEventListener('king-master-data-changed', () => { if (document.querySelector('#redacao.active[data-red-view="temas"]')) render(); });
    const inicial = () => mostrarAba('redacoes');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicial, { once: true }); else setTimeout(inicial, 0);

    window.KingTemasRedacao = Object.freeze({ render, todos, redacaoDoTema, abrirGerador, mostrarAba });
})();

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
    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (msg, erro) => window.showToast?.(msg, erro);
    let filtro = 'afazer', eixoFiltro = '', busca = '', gerando = null;

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

    function linha(tema) {
        const red = redacaoDoTema(tema);
        const origem = tema.origem === 'enem' ? `<span class="tema-tag oficial">ENEM ${esc(tema.ano)}</span>` : '<span class="tema-tag ia">IA</span>';
        const estado = red
            ? `<span class="tema-done">✓ Concluído${red.date ? ` em ${esc(dataBr(red.date))}` : ''}${red.status === 'corrected' && notaTotal(red) ? ` · nota ${notaTotal(red)}` : red.status !== 'corrected' ? ' · aguardando correção' : ''}</span>`
            : `<button type="button" class="cycle-btn primary" data-escrever="${esc(tema.id)}">Escrever</button>`;
        const apagar = tema.origem === 'enem' ? '' : `<button type="button" class="tema-remove" data-apagar-tema="${esc(tema.id)}" aria-label="Remover tema" title="Remover tema">×</button>`;
        return `<li class="tema-item${red ? ' is-done' : ''}"><div class="tema-text"><div class="tema-meta">${origem}${tema.eixo ? `<span class="tema-tag">${esc(tema.eixo)}</span>` : ''}</div><strong>${esc(tema.titulo)}</strong>${tema.recorte ? `<small>${esc(tema.recorte)}</small>` : ''}</div><div class="tema-actions">${estado}${apagar}</div></li>`;
    }

    function render() {
        const box = document.getElementById('enemWritingTools');
        if (!box) return;
        const lista = todos();
        const concluidos = lista.filter(t => redacaoDoTema(t)).length;
        if (!box.dataset.ready) {
            box.dataset.ready = '1';
            box.innerHTML = `<section class="widget tema-bank" aria-labelledby="temaBankTitle">
                <header class="tema-bank-head"><div><span class="workspace-kicker">BANCO DE TEMAS</span><h2 id="temaBankTitle">Temas para treinar</h2><p id="temaBankCount"></p></div>
                    <button type="button" class="cycle-btn primary" data-gerar-temas>✦ Gerar temas com IA</button></header>
                <div class="tema-progress"><span id="temaBankBar"></span></div>
                <div class="tema-toolbar"><div class="enem-area-chips" role="group" aria-label="Filtrar temas"><button type="button" data-tema-filtro="afazer">A fazer</button><button type="button" data-tema-filtro="concluidos">Concluídos</button><button type="button" data-tema-filtro="todos">Todos</button></div>
                    <select class="cycle-input" data-tema-eixo aria-label="Filtrar por eixo"><option value="">Todos os eixos</option>${EIXOS.map(e => `<option>${esc(e)}</option>`).join('')}</select>
                    <input type="search" class="cycle-input" data-tema-busca placeholder="Buscar tema" aria-label="Buscar tema"></div>
                <ul class="tema-list" id="temaBankList" aria-live="polite"></ul>
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
        ul.innerHTML = visiveis.length ? visiveis.map(linha).join('') : `<li class="tema-empty">${filtro === 'concluidos' ? 'Nenhum tema concluído ainda. Escreva sobre um tema e registre a redação.' : 'Nenhum tema aqui. Gere novos temas com a IA.'}</li>`;
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
            <label class="cycle-form-group"><span class="cycle-label">Quantos temas</span><select class="cycle-input" data-qtd><option>10</option><option selected>20</option><option>30</option></select></label>
            <fieldset class="tema-eixos"><legend>Eixos (deixe vazio para variar)</legend>${EIXOS.map(e => `<label><input type="checkbox" value="${esc(e)}"> ${esc(e)}</label>`).join('')}</fieldset>
            <div data-preview></div>
            <p class="enem-tool-intro" data-status role="status"></p>
            <div class="enem-tool-actions"><button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-go>Gerar temas</button></div></div>`;
        document.body.append(overlay);
        const fechar = () => { gerando?.abort(); gerando = null; overlay.remove(); };
        overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-close]')) fechar(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') fechar(); });
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
            botao.disabled = true; status.textContent = 'Gerando temas…';
            try {
                await window.kingGeminiReady;
                if (!window.kingGemini?.generateEssayThemes) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
                gerando = new AbortController();
                const existentes = new Set(todos().map(t => norm(t.titulo)));
                const lista = await window.kingGemini.generateEssayThemes({
                    count: Number(overlay.querySelector('[data-qtd]').value) || 20,
                    eixos: [...overlay.querySelectorAll('.tema-eixos input:checked')].map(i => i.value),
                    avoid: todos().map(t => t.titulo), signal: gerando.signal,
                });
                candidatos = [];
                for (const t of lista) { const k = norm(t.titulo); if (!existentes.has(k)) { existentes.add(k); candidatos.push(t); } }
                if (!candidatos.length) throw new Error('A IA não trouxe temas novos. Tente de novo ou escolha outros eixos.');
                overlay.querySelector('.tema-eixos').hidden = true;
                overlay.querySelector('[data-qtd]').closest('label').hidden = true;
                overlay.querySelector('[data-preview]').innerHTML = `<ul class="tema-preview">${candidatos.map((t, i) => `<li><label><input type="checkbox" data-candidato="${i}" checked><span><strong>${esc(t.titulo)}</strong><small>${esc(t.eixo)}${t.recorte ? ` · ${esc(t.recorte)}` : ''}</small></span></label></li>`).join('')}</ul>`;
                status.textContent = `${candidatos.length} temas novos. Desmarque os que não quiser.`;
                botao.textContent = 'Adicionar ao banco';
            } catch (error) {
                if (error?.name !== 'AbortError') status.textContent = error?.message || 'Não foi possível gerar os temas agora.';
            } finally {
                botao.disabled = false; gerando = null;
            }
        });
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

/* Banco de temas de redação: temas oficiais do ENEM + temas gerados pela IA.
   Um tema fica concluído quando existe uma redação registrada com o mesmo tema.
   Cada tema pode ganhar uma imagem criada pela IA, guardada na nuvem da conta. */
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
    const NIVEIS = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
    const NIVEL_AJUDA = {
        facil: 'Problemas concretos e do dia a dia, fáceis de argumentar com repertório comum.',
        medio: 'No padrão das provas do ENEM.',
        dificil: 'Temas mais abstratos ou pouco debatidos, que pedem repertório e recorte precisos.',
        variado: 'Uma mistura de fácil, médio e difícil.',
    };
    const MAX_GERAR = 20;

    // Fotos do Pexels: palavras de busca em inglês (o acervo responde melhor assim).
    const BUSCA_OFICIAL = {
        2024: 'afro brazilian culture celebration', 2023: 'woman caring for elderly family', 2022: 'indigenous community brazil',
        2021: 'family documents identity card', 2020: 'mental health support conversation', 2019: 'cinema audience movie theater',
        2018: 'smartphone social media privacy', 2017: 'sign language classroom', 2016: 'religious diversity people',
        2015: 'women solidarity support group', 2014: 'child watching television', 2013: 'traffic police checkpoint night',
    };
    const BUSCA_EIXO = {
        'Educação': 'students classroom brazil', 'Saúde': 'public health clinic', 'Meio ambiente': 'nature environment brazil',
        'Tecnologia': 'people using technology', 'Cidadania': 'community people city', 'Cultura': 'brazilian culture festival',
        'Trabalho': 'workers working', 'Segurança': 'city street safety', 'Desigualdade': 'urban inequality favela city',
        'Mobilidade': 'public transport city traffic',
    };
    const PEXELS = 'https://api.pexels.com/v1/search';
    const resultadosFoto = new Map(); // consulta -> fotos
    const buscandoFoto = new Set();

    // Ilustração de reserva (sem IA): degradê, formas e um ícone do eixo, variando pelo título.
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
    const LAPIS = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3"/></svg>';
    const BRILHO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5z"/><path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/></svg>';
    const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.3-2h5l1.3 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/></svg>';
    const DADO = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="9" cy="15" r="1.1"/><circle cx="15" cy="15" r="1.1"/></svg>';

    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const toast = (msg, erro) => window.showToast?.(msg, erro);
    const semente = texto => [...String(texto)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    let filtro = 'afazer', eixoFiltro = '', busca = '', gerando = null;
    const imagens = new Map(); // temaId -> dataUrl | 'carregando' | 'erro'
    const criando = new Set();
    let filaImagens = Promise.resolve();

    function banco() {
        const d = dados();
        if (!Array.isArray(d.temasRedacao)) d.temasRedacao = [];
        return d.temasRedacao;
    }
    function ocultos() {
        const d = dados();
        if (!Array.isArray(d.temasOcultos)) d.temasOcultos = [];
        return d.temasOcultos;
    }
    function mapaImagens() {
        const d = dados();
        if (!d.temasImagens || typeof d.temasImagens !== 'object' || Array.isArray(d.temasImagens)) d.temasImagens = {};
        return d.temasImagens;
    }

    function mapaFotos() {
        const d = dados();
        if (!d.temasFotos || typeof d.temasFotos !== 'object' || Array.isArray(d.temasFotos)) d.temasFotos = {};
        return d.temasFotos;
    }
    const chavePexels = () => String(dados().pexelsKey || '').trim();

    function consultaFoto(tema) {
        return String(tema.busca || BUSCA_OFICIAL[tema.ano] || BUSCA_EIXO[tema.eixo] || 'students writing essay').slice(0, 80);
    }

    async function pesquisarPexels(consulta, chave = chavePexels()) {
        if (resultadosFoto.has(consulta)) return resultadosFoto.get(consulta);
        const resposta = await fetch(`${PEXELS}?query=${encodeURIComponent(consulta)}&orientation=landscape&per_page=20`, { headers: { Authorization: chave } });
        if (resposta.status === 401 || resposta.status === 403) throw new Error('A chave do Pexels não foi aceita. Confira se copiou a chave inteira.');
        if (resposta.status === 429) throw new Error('O Pexels pediu uma pausa: muitas buscas seguidas. Tente de novo em alguns minutos.');
        if (!resposta.ok) throw new Error('O Pexels não respondeu agora. Tente de novo.');
        const corpo = await resposta.json();
        const fotos = (Array.isArray(corpo?.photos) ? corpo.photos : []).filter(f => /^https:\/\/images\.pexels\.com\//.test(f?.src?.landscape || '')).map(f => ({
            id: Number(f.id), src: f.src.landscape, autor: String(f.photographer || 'Pexels').slice(0, 80),
            autorUrl: /^https:\/\/www\.pexels\.com\//.test(f.photographer_url || '') ? f.photographer_url : 'https://www.pexels.com',
            pagina: /^https:\/\/www\.pexels\.com\//.test(f.url || '') ? f.url : 'https://www.pexels.com', alt: String(f.alt || '').slice(0, 160),
        }));
        resultadosFoto.set(consulta, fotos);
        return fotos;
    }

    // Escolhe uma foto que nenhum outro tema esteja usando; "trocar" pula para a próxima.
    async function buscarFoto(tema, { trocar = false, silencioso = false } = {}) {
        if (buscandoFoto.has(tema.id)) return false;
        if (!chavePexels()) { if (!silencioso) abrirChavePexels(() => buscarFoto(tema, { trocar })); return false; }
        buscandoFoto.add(tema.id);
        atualizarCartao(tema.id);
        try {
            const fotos = await pesquisarPexels(consultaFoto(tema));
            const mapa = mapaFotos();
            const emUso = new Set(Object.entries(mapa).filter(([id]) => id !== tema.id).map(([, f]) => f?.id));
            const atual = mapa[tema.id]?.id;
            const livres = fotos.filter(f => !emUso.has(f.id));
            const lista = livres.length ? livres : fotos;
            if (!lista.length) throw new Error('O Pexels não achou fotos para este tema.');
            const inicio = trocar && atual ? (lista.findIndex(f => f.id === atual) + 1) % lista.length : 0;
            mapa[tema.id] = lista[inicio];
            window.saveAppData?.();
            return true;
        } catch (error) {
            if (!silencioso) toast(error?.message || 'Não foi possível buscar a foto.', true);
            throw error;
        } finally {
            buscandoFoto.delete(tema.id);
            atualizarCartao(tema.id);
        }
    }

    async function buscarFotosEmFila(temas) {
        let feitas = 0;
        for (const tema of temas) {
            try { if (await buscarFoto(tema, { silencioso: true })) feitas += 1; }
            catch (error) { toast(`${feitas ? `${feitas} ${feitas === 1 ? 'foto colocada' : 'fotos colocadas'}. ` : ''}${error?.message || 'Não foi possível buscar as fotos.'}`, true); return; }
        }
        if (feitas) toast(`📷 ${feitas} ${feitas === 1 ? 'foto colocada' : 'fotos colocadas'} nos temas.`);
    }

    // Automático: com a chave salva, todo tema sem imagem ganha uma foto quando aparece na lista.
    const autoFotosLigado = () => dados().pexelsAuto !== false;
    const tentadosAuto = new Set();
    let autoRodando = false, autoParado = false;
    function colocarFotosAutomaticamente(lista) {
        if (autoRodando || autoParado || !chavePexels() || !autoFotosLigado()) return;
        const faltam = lista.filter(t => !t.semImagem && !t.imagemIa && !mapaFotos()[t.id] && !mapaImagens()[t.id]
            && !tentadosAuto.has(t.id) && !buscandoFoto.has(t.id) && !criando.has(t.id));
        if (!faltam.length) return;
        autoRodando = true;
        (async () => {
            for (const tema of faltam) {
                tentadosAuto.add(tema.id);
                try { await buscarFoto(tema, { silencioso: true }); }
                catch (error) { autoParado = true; console.warn('Fotos automáticas pausadas.', error?.message || error); break; }
            }
            autoRodando = false;
        })();
    }

    function abrirChavePexels(depois) {
        document.getElementById('pexelsKeyModal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay tema-gen-overlay';
        overlay.id = 'pexelsKeyModal';
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'pexelsKeyTitle');
        overlay.innerHTML = `<div class="modal-box tema-gen tema-gen-small">
            <button type="button" class="modal-close" data-close aria-label="Fechar">×</button>
            <header class="tema-gen-head"><span class="tema-gen-mark is-photo" aria-hidden="true">${CAMERA}</span><div><h2 id="pexelsKeyTitle">Fotos do Pexels</h2><p>O Pexels é um banco de fotos gratuito. Para o site buscar as fotos, cole a sua chave de acesso. Ela fica salva na sua conta.</p></div></header>
            <div class="tema-gen-body">
                <ol class="pexels-steps"><li>Abra <a href="https://www.pexels.com/api/" target="_blank" rel="noopener">pexels.com/api</a> e entre ou crie uma conta grátis.</li><li>Clique em <b>Your API Key</b>, preencha o pedido (pode escrever "site de estudos para o ENEM") e copie a chave.</li><li>Cole a chave abaixo.</li></ol>
                <label class="cycle-form-group"><span class="cycle-label">Chave do Pexels</span><input type="text" class="cycle-input" data-pexels-key autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave" value="${esc(chavePexels())}"></label>
                <label class="tema-gen-toggle"><input type="checkbox" data-pexels-auto ${autoFotosLigado() ? 'checked' : ''}><span class="tema-gen-switch" aria-hidden="true"></span><span><strong>Colocar fotos automaticamente</strong><small>Todo tema sem imagem ganha uma foto sozinho, inclusive os novos.</small></span></label>
            </div>
            <p class="tema-gen-status" data-status role="status"></p>
            <footer class="tema-gen-foot">${chavePexels() ? '<button type="button" class="cycle-btn tema-gen-remove-key" data-remover>Remover chave</button>' : ''}<button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-salvar>Salvar chave</button></footer>
        </div>`;
        document.body.append(overlay);
        const fechar = () => overlay.remove();
        const status = overlay.querySelector('[data-status]');
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') fechar(); });
        overlay.addEventListener('click', async event => {
            if (event.target === overlay || event.target.closest('[data-close]')) return fechar();
            if (event.target.closest('[data-remover]')) { delete dados().pexelsKey; window.saveAppData?.(); fechar(); toast('Chave do Pexels removida.'); render(); return; }
            const salvar = event.target.closest('[data-salvar]');
            if (!salvar) return;
            const chave = overlay.querySelector('[data-pexels-key]').value.trim();
            if (chave.length < 20) { status.textContent = 'Essa chave parece incompleta.'; return; }
            salvar.disabled = true; status.textContent = 'Conferindo a chave…';
            try {
                resultadosFoto.clear();
                await pesquisarPexels('students', chave);
                resultadosFoto.clear();
                dados().pexelsKey = chave;
                dados().pexelsAuto = overlay.querySelector('[data-pexels-auto]').checked;
                autoParado = false; tentadosAuto.clear();
                window.saveAppData?.();
                fechar();
                toast('📷 Chave do Pexels salva.');
                render();
                depois?.();
            } catch (error) {
                status.textContent = error?.message || 'Não foi possível conferir a chave.';
            } finally { salvar.disabled = false; }
        });
        requestAnimationFrame(() => { overlay.classList.add('active'); overlay.querySelector('[data-pexels-key]').focus(); });
    }

    function todos() {
        const proprios = banco();
        const chaves = new Set(proprios.map(t => norm(t.titulo)));
        const escondidos = new Set(ocultos());
        const oficiais = OFICIAIS.filter(([ano, titulo]) => !chaves.has(norm(titulo)) && !escondidos.has(`enem-${ano}`))
            .map(([ano, titulo, eixo]) => ({ id: `enem-${ano}`, titulo, eixo, origem: 'enem', ano }));
        return [...proprios, ...oficiais];
    }

    function redacaoDoTema(tema) {
        const chave = norm(tema.titulo);
        const lista = (dados().redacaoItems || []).filter(item => norm(item.theme) === chave);
        return lista.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
    }

    const notaTotal = r => ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((t, k) => t + (Number(r[k]) || 0), 0);
    const dataBr = iso => iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replaceAll('.', '') : '';

    function ilustracao(tema) {
        const arte = ARTE[tema.eixo] || ARTE_PADRAO;
        const h = semente(tema.titulo);
        const [a, b] = arte.cores;
        const id = `g${h.toString(36)}`;
        const bolhas = [0, 1, 2, 3].map(i => {
            const x = (h >>> (i * 5)) % 320, y = (h >>> (i * 3 + 2)) % 150, r = 24 + ((h >>> (i * 4)) % 46);
            return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${(0.07 + i * 0.03).toFixed(2)}"/>`;
        }).join('');
        return `<svg class="tema-art" viewBox="0 0 320 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
            <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
            <rect width="320" height="150" fill="url(#${id})"/>${bolhas}
            <path d="M-20 ${110 + (h % 25)} C 80 ${70 + (h % 40)}, 200 ${150 - (h % 30)}, 340 ${95 + (h % 30)} L340 170 L-20 170 Z" fill="#fff" opacity=".12"/>
            <g transform="translate(212 34) rotate(${(h % 50) - 25} 40 40) scale(3.4)" fill="none" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".92">${arte.icone}</g>
        </svg>`;
    }

    function arteDoCartao(tema) {
        const foto = mapaFotos()[tema.id];
        if (foto?.src && /^https:\/\/images\.pexels\.com\//.test(foto.src)) {
            const trocando = buscandoFoto.has(tema.id);
            return `<img class="tema-photo" src="${esc(foto.src)}" alt="${esc(foto.alt || '')}" loading="lazy" referrerpolicy="no-referrer">
                <span class="tema-photo-credit">Foto: <a href="${esc(foto.autorUrl)}" target="_blank" rel="noopener">${esc(foto.autor)}</a> / <a href="${esc(foto.pagina)}" target="_blank" rel="noopener">Pexels</a></span>
                ${trocando ? `<span class="tema-card-ai is-busy">${CAMERA}<span>Buscando…</span></span>` : `<button type="button" class="tema-card-ai is-icon" data-trocar-foto="${esc(tema.id)}" aria-label="Trocar a foto" title="Trocar a foto">↻</button>`}`;
        }
        const imagem = imagens.get(tema.id);
        if (imagem && imagem.startsWith('data:image/')) return `<img class="tema-photo" src="${imagem}" alt="" loading="lazy">`;
        const ocupada = criando.has(tema.id) || imagem === 'carregando' || buscandoFoto.has(tema.id);
        const temImagemSalva = Boolean(mapaImagens()[tema.id]);
        const rotulo = buscandoFoto.has(tema.id) ? 'Buscando foto…' : criando.has(tema.id) ? 'Criando imagem…' : 'Carregando…';
        const botao = ocupada
            ? `<span class="tema-card-ai is-busy">${CAMERA}<span>${rotulo}</span></span>`
            : temImagemSalva && imagem !== 'erro' ? '' : `<button type="button" class="tema-card-ai" data-foto-tema="${esc(tema.id)}">${CAMERA}<span>Colocar foto</span></button>`;
        return ilustracao(tema) + botao;
    }

    function cartao(tema) {
        const red = redacaoDoTema(tema);
        const selo = tema.origem === 'enem' ? `ENEM ${esc(tema.ano)}` : 'Gerado por IA';
        const nota = red && red.status === 'corrected' && notaTotal(red) ? ` · nota ${notaTotal(red)}` : red && red.status !== 'corrected' ? ' · aguardando correção' : '';
        const rodape = red
            ? `<span class="tema-card-done">✓ Concluído${red.date ? ` em ${esc(dataBr(red.date))}` : ''}${nota}</span><button type="button" class="tema-card-again" data-escrever="${esc(tema.id)}">Escrever de novo</button>`
            : `<button type="button" class="tema-card-write" data-escrever="${esc(tema.id)}">${LAPIS}<span>Escrever sobre este tema</span><b aria-hidden="true">→</b></button>`;
        const apagar = red ? '' : `<button type="button" class="tema-card-remove" data-apagar-tema="${esc(tema.id)}" aria-label="Excluir o tema ${esc(tema.titulo)}" title="Excluir tema">×</button>`;
        const nivel = NIVEIS[tema.nivel] ? `<span class="tema-chip nivel-${esc(tema.nivel)}">${NIVEIS[tema.nivel]}</span>` : '';
        return `<li class="tema-card${red ? ' is-done' : ''}" data-tema-card="${esc(tema.id)}">
            <div class="tema-card-art">${arteDoCartao(tema)}<span class="tema-card-badge${tema.origem === 'enem' ? '' : ' is-ia'}">${selo}</span>${apagar}</div>
            <div class="tema-card-body"><div class="tema-card-chips">${tema.eixo ? `<span class="tema-chip">${esc(tema.eixo)}</span>` : ''}${nivel}</div>
                <h3>${esc(tema.titulo)}</h3>${tema.recorte ? `<p>${esc(tema.recorte)}</p>` : ''}<div class="tema-card-foot">${rodape}</div></div>
        </li>`;
    }

    function visiveisAgora() {
        return todos().filter(t => {
            const feito = Boolean(redacaoDoTema(t));
            if (filtro === 'afazer' && feito) return false;
            if (filtro === 'concluidos' && !feito) return false;
            if (eixoFiltro && norm(t.eixo) !== norm(eixoFiltro)) return false;
            if (busca && !norm(t.titulo).includes(norm(busca))) return false;
            return true;
        });
    }

    function render() {
        const box = document.getElementById('enemWritingTools');
        if (!box) return;
        const lista = todos();
        const concluidos = lista.filter(t => redacaoDoTema(t)).length;
        if (!box.dataset.ready) {
            box.dataset.ready = '2';
            box.innerHTML = `<section class="widget tema-bank" aria-labelledby="temaBankTitle">
                <header class="tema-bank-hero"><span class="tema-bank-mark" aria-hidden="true">${LAPIS}</span><div class="tema-bank-hero-copy"><span class="workspace-kicker">BANCO DE TEMAS</span><h2 id="temaBankTitle">Qual tema você vai escrever hoje?</h2>
                    <p>Escolha uma proposta, escreva sua dissertação-argumentativa e registre a redação. O tema fica concluído na hora.</p></div>
                    <div class="tema-bank-actions"><button type="button" class="cycle-btn primary" data-gerar-temas>✦ Gerar temas com IA</button><button type="button" class="cycle-btn" data-red-tab="redacoes">Minhas redações</button></div></header>
                <div class="tema-bank-progress"><p id="temaBankCount"></p><div class="tema-progress"><span id="temaBankBar"></span></div></div>
                <div class="tema-toolbar"><div class="enem-area-chips" role="group" aria-label="Filtrar temas"><button type="button" data-tema-filtro="afazer">A fazer</button><button type="button" data-tema-filtro="concluidos">Concluídos</button><button type="button" data-tema-filtro="todos">Todos</button></div>
                    <select class="cycle-input" data-tema-eixo aria-label="Filtrar por eixo"><option value="">Todos os eixos</option>${EIXOS.map(e => `<option>${esc(e)}</option>`).join('')}</select>
                    <input type="search" class="cycle-input" data-tema-busca placeholder="Buscar tema" aria-label="Buscar tema">
                    <button type="button" class="tema-photos-btn" data-fotos-todos hidden>${CAMERA}<span>Colocar fotos</span></button>
                    <button type="button" class="tema-clear" data-limpar-afazer hidden>Excluir os temas a fazer</button></div>
                <ul class="tema-grid" id="temaBankList" aria-live="polite"></ul>
                <div class="tema-bank-foot"><p class="tema-restore" id="temaRestore" hidden><button type="button" data-restaurar-enem>Mostrar de novo os temas oficiais do ENEM que você excluiu</button></p>
                    <button type="button" class="tema-config-pexels" data-config-pexels>${CAMERA}<span>Fotos do Pexels</span></button></div>
            </section>`;
        }
        document.getElementById('temaBankCount').textContent = `${lista.length} ${lista.length === 1 ? 'tema' : 'temas'} · ${concluidos} ${concluidos === 1 ? 'concluído' : 'concluídos'}`;
        document.getElementById('temaBankBar').style.width = `${lista.length ? Math.round(concluidos / lista.length * 100) : 0}%`;
        box.querySelectorAll('[data-tema-filtro]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.temaFiltro === filtro)));
        const visiveis = visiveisAgora();
        const limpar = box.querySelector('[data-limpar-afazer]');
        limpar.hidden = filtro !== 'afazer' || !visiveis.length;
        const semFoto = visiveis.filter(t => !mapaFotos()[t.id] && !mapaImagens()[t.id]).length;
        const fotos = box.querySelector('[data-fotos-todos]');
        fotos.hidden = !semFoto;
        fotos.querySelector('span').textContent = `Colocar fotos (${semFoto})`;
        limpar.textContent = `Excluir ${visiveis.length === 1 ? 'o tema' : `os ${visiveis.length} temas`} a fazer`;
        document.getElementById('temaRestore').hidden = !ocultos().length;
        const ul = document.getElementById('temaBankList');
        ul.innerHTML = visiveis.length ? visiveis.map(cartao).join('') : `<li class="tema-empty">${filtro === 'concluidos' ? 'Nenhum tema concluído ainda. Escreva sobre um tema e registre a redação.' : 'Nenhum tema aqui. Gere novos temas com a IA.'}</li>`;
        carregarImagens(visiveis);
        colocarFotosAutomaticamente(visiveis);
    }

    function atualizarCartao(id) {
        const li = document.querySelector(`#temaBankList [data-tema-card="${CSS.escape(id)}"]`);
        const tema = todos().find(t => t.id === id);
        if (li && tema) li.outerHTML = cartao(tema);
    }

    // Imagens salvas na nuvem: carrega as dos temas visíveis, uma vez por sessão.
    function carregarImagens(lista) {
        const mapa = mapaImagens();
        for (const tema of lista) {
            const docId = mapa[tema.id];
            if (!docId || imagens.has(tema.id) || !window.kingCloud?.getReviewImage) continue;
            imagens.set(tema.id, 'carregando');
            window.kingCloud.getReviewImage(docId)
                .then(img => imagens.set(tema.id, img.dataUrl))
                .catch(() => imagens.set(tema.id, 'erro'))
                .finally(() => atualizarCartao(tema.id));
        }
    }

    function comprimir(base64, mimeType) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const largura = 768, altura = 384;
                const canvas = document.createElement('canvas');
                canvas.width = largura; canvas.height = altura;
                const ctx = canvas.getContext('2d');
                const escala = Math.max(largura / img.width, altura / img.height);
                const w = img.width * escala, h = img.height * escala;
                ctx.drawImage(img, (largura - w) / 2, (altura - h) / 2, w, h);
                let url = canvas.toDataURL('image/webp', 0.82);
                if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', 0.82);
                resolve({ dataUrl: url, width: largura, height: altura, type: url.slice(5, url.indexOf(';')) });
            };
            img.onerror = () => reject(new Error('A imagem criada pela IA não pôde ser lida.'));
            img.src = `data:${mimeType};base64,${base64}`;
        });
    }

    async function criarImagem(tema, { silencioso = false } = {}) {
        if (criando.has(tema.id)) return false;
        criando.add(tema.id);
        atualizarCartao(tema.id);
        try {
            await window.kingGeminiReady;
            if (!window.kingGemini?.generateThemeImage) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
            const bruta = await window.kingGemini.generateThemeImage({ titulo: tema.titulo, recorte: tema.recorte || '' });
            const img = await comprimir(bruta.data, bruta.mimeType);
            const docId = `tema-${String(tema.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 70)}`;
            if (window.kingCloud?.saveReviewImage) {
                await window.kingCloud.saveReviewImage({ id: docId, reviewId: 'banco-temas', name: tema.titulo.slice(0, 100), type: img.type, width: img.width, height: img.height, dataUrl: img.dataUrl });
                mapaImagens()[tema.id] = docId;
                window.saveAppData?.();
            }
            imagens.set(tema.id, img.dataUrl);
            return true;
        } catch (error) {
            if (!silencioso) toast(error?.message || 'Não foi possível criar a imagem agora.', true);
            throw error;
        } finally {
            criando.delete(tema.id);
            atualizarCartao(tema.id);
        }
    }

    function criarImagensEmFila(temas) {
        let feitas = 0, parou = false;
        filaImagens = filaImagens.then(async () => {
            for (const tema of temas) {
                if (parou) break;
                try { await criarImagem(tema, { silencioso: true }); feitas += 1; }
                catch (error) { parou = true; toast(`${feitas ? `${feitas} ${feitas === 1 ? 'imagem criada' : 'imagens criadas'}. ` : ''}${error?.message || 'Não foi possível criar as imagens.'}`, true); }
            }
            if (!parou && feitas) toast(`✦ ${feitas} ${feitas === 1 ? 'imagem criada' : 'imagens criadas'} para os temas.`);
        });
        return filaImagens;
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

    function excluirTemas(lista) {
        const ids = new Set(lista.map(t => t.id));
        const mapa = mapaImagens();
        for (const tema of lista) {
            if (tema.origem === 'enem') { if (!ocultos().includes(tema.id)) ocultos().push(tema.id); }
            if (mapa[tema.id]) { window.kingCloud?.deleteReviewImage?.(mapa[tema.id])?.catch?.(() => {}); delete mapa[tema.id]; }
            delete mapaFotos()[tema.id];
            imagens.delete(tema.id);
        }
        dados().temasRedacao = banco().filter(t => !ids.has(t.id));
        window.saveAppData?.();
        render();
    }

    function abrirGerador() {
        document.getElementById('temaGenModal')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay tema-gen-overlay';
        overlay.id = 'temaGenModal';
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'temaGenTitle');
        overlay.innerHTML = `<div class="modal-box tema-gen">
            <button type="button" class="modal-close" data-close aria-label="Fechar">×</button>
            <header class="tema-gen-head"><span class="tema-gen-mark" aria-hidden="true">${BRILHO}</span><div><h2 id="temaGenTitle">Gerar temas com IA</h2><p>Temas originais no estilo do ENEM, sem repetir os que você já tem. Você revisa antes de adicionar.</p></div></header>
            <div class="tema-gen-body" data-etapa="config">
                <section class="tema-gen-field"><div class="tema-gen-label"><strong id="temaQtdLabel">Quantidade</strong><small>de 1 a ${MAX_GERAR} por vez</small></div>
                    <div class="tema-qtd-row"><button type="button" data-qtd-step="-1" aria-label="Menos um tema">−</button><input type="number" class="cycle-input" data-qtd min="1" max="${MAX_GERAR}" value="10" inputmode="numeric" aria-labelledby="temaQtdLabel"><button type="button" data-qtd-step="1" aria-label="Mais um tema">+</button>
                    <input type="range" data-qtd-range min="1" max="${MAX_GERAR}" value="10" aria-label="Quantidade de temas"></div></section>
                <section class="tema-gen-field"><div class="tema-gen-label"><strong>Eixos</strong><small>Aleatório sorteia eixos variados</small></div>
                    <div class="tema-gen-chips" role="group" aria-label="Eixos dos temas"><button type="button" class="tema-gen-chip is-random" data-eixo="" aria-pressed="true">${DADO}<span>Aleatório</span></button>${EIXOS.map(e => `<button type="button" class="tema-gen-chip" data-eixo="${esc(e)}" aria-pressed="false">${esc(e)}</button>`).join('')}</div></section>
                <section class="tema-gen-field"><div class="tema-gen-label"><strong>Nível de dificuldade</strong><small data-nivel-ajuda>${NIVEL_AJUDA.medio}</small></div>
                    <div class="tema-gen-segment" role="radiogroup" aria-label="Nível de dificuldade">${[['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil'], ['variado', 'Aleatório']].map(([v, r]) => `<button type="button" role="radio" data-nivel="${v}" aria-checked="${v === 'medio'}">${r}</button>`).join('')}</div></section>
                <section class="tema-gen-field"><div class="tema-gen-label"><strong>Imagem dos cartões</strong><small data-imagem-ajuda></small></div>
                    <div class="tema-gen-segment is-three" role="radiogroup" aria-label="Imagem dos cartões">${[['foto', 'Foto do Pexels'], ['ia', 'Imagem com IA'], ['nenhuma', 'Sem imagem']].map(([v, r]) => `<button type="button" role="radio" data-imagem-modo="${v}" aria-checked="${v === 'foto'}">${r}</button>`).join('')}</div>
                    <button type="button" class="tema-gen-keylink" data-config-pexels-gen hidden>${CAMERA}<span>Configurar a chave do Pexels</span></button></section>
            </div>
            <div class="tema-gen-body" data-etapa="revisao" hidden><p class="tema-gen-hint" data-revisao-texto></p><ul class="tema-gen-preview" data-preview></ul></div>
            <p class="tema-gen-status" data-status role="status"></p>
            <footer class="tema-gen-foot"><button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-go>Gerar 10 temas</button></footer>
        </div>`;
        document.body.append(overlay);
        const fechar = () => { gerando?.abort(); gerando = null; overlay.remove(); };
        const botao = overlay.querySelector('[data-go]');
        const status = overlay.querySelector('[data-status]');
        const qtd = overlay.querySelector('[data-qtd]');
        const faixa = overlay.querySelector('[data-qtd-range]');
        let candidatos = null;
        let nivel = 'medio';
        let modoImagem = 'foto';
        const AJUDA_IMAGEM = {
            foto: () => chavePexels() ? 'Fotos reais e gratuitas do Pexels, com crédito ao fotógrafo.' : 'Fotos gratuitas do Pexels. Falta configurar a sua chave.',
            ia: () => 'O Gemini cria uma imagem para cada tema. Exige o plano Blaze no Firebase.',
            nenhuma: () => 'Os cartões ficam com a ilustração do eixo.',
        };
        const atualizarImagem = () => {
            overlay.querySelectorAll('[data-imagem-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.imagemModo === modoImagem)));
            overlay.querySelector('[data-imagem-ajuda]').textContent = AJUDA_IMAGEM[modoImagem]();
            overlay.querySelector('[data-config-pexels-gen]').hidden = modoImagem !== 'foto' || Boolean(chavePexels());
        };
        atualizarImagem();
        const quantidade = () => Math.max(1, Math.min(MAX_GERAR, Math.round(Number(qtd.value) || 1)));
        const textoBotao = () => { const v = quantidade(); botao.textContent = `Gerar ${v} ${v === 1 ? 'tema' : 'temas'}`; };
        const sincronizar = valor => { const v = Math.max(1, Math.min(MAX_GERAR, Math.round(Number(valor) || 1))); qtd.value = v; faixa.value = v; if (!candidatos) textoBotao(); };
        const eixosEscolhidos = () => [...overlay.querySelectorAll('[data-eixo]:not(.is-random)[aria-pressed="true"]')].map(b => b.dataset.eixo);

        overlay.addEventListener('click', event => {
            if (event.target === overlay || event.target.closest('[data-close]')) return fechar();
            const passo = event.target.closest('[data-qtd-step]');
            if (passo) return sincronizar(quantidade() + Number(passo.dataset.qtdStep));
            const chip = event.target.closest('[data-eixo]');
            if (chip) {
                const aleatorio = overlay.querySelector('.tema-gen-chip.is-random');
                if (chip === aleatorio) overlay.querySelectorAll('[data-eixo]').forEach(b => b.setAttribute('aria-pressed', String(b === aleatorio)));
                else {
                    chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
                    aleatorio.setAttribute('aria-pressed', String(!eixosEscolhidos().length));
                }
                return;
            }
            const opcao = event.target.closest('[data-nivel]');
            if (opcao) {
                nivel = opcao.dataset.nivel;
                overlay.querySelectorAll('[data-nivel]').forEach(b => b.setAttribute('aria-checked', String(b === opcao)));
                overlay.querySelector('[data-nivel-ajuda]').textContent = NIVEL_AJUDA[nivel];
                return;
            }
            const modo = event.target.closest('[data-imagem-modo]');
            if (modo) { modoImagem = modo.dataset.imagemModo; atualizarImagem(); return; }
            if (event.target.closest('[data-config-pexels-gen]')) abrirChavePexels(atualizarImagem);
        });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') fechar(); });
        faixa.addEventListener('input', () => sincronizar(faixa.value));
        qtd.addEventListener('change', () => sincronizar(qtd.value));
        qtd.addEventListener('input', () => { if (qtd.value !== '') { faixa.value = quantidade(); textoBotao(); } });
        overlay.addEventListener('change', event => {
            if (event.target.matches('[data-candidato]')) {
                const n = overlay.querySelectorAll('[data-candidato]:checked').length;
                botao.textContent = `Adicionar ${n} ${n === 1 ? 'tema' : 'temas'}`;
                botao.disabled = !n;
            }
        });

        botao.addEventListener('click', async () => {
            if (candidatos) {
                const escolhidos = [...overlay.querySelectorAll('[data-candidato]:checked')].map(i => candidatos[Number(i.dataset.candidato)]);
                if (!escolhidos.length) return toast('Marque ao menos um tema.', true);
                const agora = Date.now();
                const novos = escolhidos.map((t, i) => {
                    const novo = { id: `tema-${agora.toString(36)}-${i}`, titulo: t.titulo, eixo: EIXOS.find(e => norm(e) === norm(t.eixo)) || t.eixo, recorte: t.recorte, origem: 'ia', criadoEm: agora };
                    if (NIVEIS[t.nivel]) novo.nivel = t.nivel;
                    if (t.busca) novo.busca = String(t.busca).slice(0, 80);
                    if (modoImagem === 'nenhuma') novo.semImagem = true;
                    if (modoImagem === 'ia') novo.imagemIa = true;
                    return novo;
                });
                banco().unshift(...novos);
                window.saveAppData?.();
                fechar();
                filtro = 'afazer'; eixoFiltro = ''; busca = '';
                const box = document.getElementById('enemWritingTools');
                const campoEixo = box?.querySelector('[data-tema-eixo]'), campoBusca = box?.querySelector('[data-tema-busca]');
                if (campoEixo) campoEixo.value = '';
                if (campoBusca) campoBusca.value = '';
                render();
                const extra = modoImagem === 'ia' ? ' Criando as imagens…' : modoImagem === 'foto' && chavePexels() ? ' Buscando as fotos…' : '';
                toast(`✦ ${novos.length} ${novos.length === 1 ? 'tema adicionado' : 'temas adicionados'} ao banco.${extra}`);
                if (modoImagem === 'ia') criarImagensEmFila(novos);
                else if (modoImagem === 'foto') {
                    if (!chavePexels()) abrirChavePexels(() => { if (!autoFotosLigado()) buscarFotosEmFila(novos); });
                    else if (!autoFotosLigado()) buscarFotosEmFila(novos); // ligado, o render já coloca as fotos
                }
                return;
            }
            botao.disabled = true; status.textContent = `Gerando ${quantidade()} ${quantidade() === 1 ? 'tema' : 'temas'}…`;
            try {
                await window.kingGeminiReady;
                if (!window.kingGemini?.generateEssayThemes) throw new Error('A IA não está disponível agora. Entre na sua conta e tente de novo.');
                gerando = new AbortController();
                const existentes = new Set(todos().map(t => norm(t.titulo)));
                const lista = await window.kingGemini.generateEssayThemes({ count: quantidade(), eixos: eixosEscolhidos(), nivel, avoid: todos().map(t => t.titulo), signal: gerando.signal });
                const novos = [];
                for (const t of lista) { const k = norm(t.titulo); if (!existentes.has(k)) { existentes.add(k); novos.push(t); } }
                if (!novos.length) throw new Error('A IA não trouxe temas novos. Tente de novo ou escolha outros eixos.');
                candidatos = novos;
                overlay.querySelector('[data-etapa="config"]').hidden = true;
                overlay.querySelector('[data-etapa="revisao"]').hidden = false;
                overlay.querySelector('[data-revisao-texto]').textContent = `${candidatos.length} ${candidatos.length === 1 ? 'tema novo' : 'temas novos'}. Desmarque os que não quiser.`;
                overlay.querySelector('[data-preview]').innerHTML = candidatos.map((t, i) => `<li><label><input type="checkbox" data-candidato="${i}" checked><span class="tema-gen-item"><span class="tema-card-chips">${t.eixo ? `<span class="tema-chip">${esc(t.eixo)}</span>` : ''}${NIVEIS[t.nivel] ? `<span class="tema-chip nivel-${esc(t.nivel)}">${NIVEIS[t.nivel]}</span>` : ''}</span><strong>${esc(t.titulo)}</strong>${t.recorte ? `<small>${esc(t.recorte)}</small>` : ''}</span></label></li>`).join('');
                status.textContent = '';
                botao.textContent = `Adicionar ${candidatos.length} ${candidatos.length === 1 ? 'tema' : 'temas'}`;
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
        secao.querySelectorAll('.redacao-tabs [data-red-tab]').forEach(botao => botao.setAttribute('aria-selected', String(botao.dataset.redTab === secao.dataset.redView)));
        if (temas) render();
    }

    document.addEventListener('click', event => {
        const alvo = event.target.closest('button');
        if (alvo?.dataset.redTab) { mostrarAba(alvo.dataset.redTab); return; }
        if (!alvo || !alvo.closest('#enemWritingTools')) return;
        if (alvo.dataset.temaFiltro) { filtro = alvo.dataset.temaFiltro; render(); }
        else if (alvo.dataset.escrever) escrever(alvo.dataset.escrever);
        else if (alvo.dataset.imagemTema) { const tema = todos().find(t => t.id === alvo.dataset.imagemTema); if (tema) criarImagem(tema).catch(() => {}); }
        else if (alvo.dataset.fotoTema) {
            const tema = todos().find(t => t.id === alvo.dataset.fotoTema);
            if (tema) { delete tema.semImagem; delete tema.imagemIa; buscarFoto(tema).catch(() => {}); }
        }
        else if (alvo.dataset.trocarFoto) { const tema = todos().find(t => t.id === alvo.dataset.trocarFoto); if (tema) buscarFoto(tema, { trocar: true }).catch(() => {}); }
        else if (alvo.hasAttribute('data-fotos-todos')) {
            const lista = visiveisAgora().filter(t => !mapaFotos()[t.id] && !mapaImagens()[t.id]);
            if (chavePexels()) buscarFotosEmFila(lista); else abrirChavePexels(() => buscarFotosEmFila(lista));
        } else if (alvo.hasAttribute('data-config-pexels')) abrirChavePexels();
        else if (alvo.hasAttribute('data-gerar-temas')) abrirGerador();
        else if (alvo.dataset.apagarTema) {
            const tema = todos().find(t => t.id === alvo.dataset.apagarTema);
            if (tema && window.confirm(`Excluir o tema "${tema.titulo}"?${tema.origem === 'enem' ? ' Você pode mostrar os temas oficiais de novo no fim da lista.' : ''}`)) excluirTemas([tema]);
        } else if (alvo.hasAttribute('data-limpar-afazer')) {
            const lista = visiveisAgora().filter(t => !redacaoDoTema(t));
            if (lista.length && window.confirm(`Excluir ${lista.length === 1 ? 'o tema' : `os ${lista.length} temas`} a fazer${eixoFiltro || busca ? ' que aparecem com este filtro' : ''}? Temas concluídos e suas redações continuam salvos.`)) excluirTemas(lista);
        } else if (alvo.hasAttribute('data-restaurar-enem')) {
            dados().temasOcultos = [];
            window.saveAppData?.(); render();
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

    window.KingTemasRedacao = Object.freeze({ render, todos, redacaoDoTema, abrirGerador, mostrarAba, criarImagem });
})();

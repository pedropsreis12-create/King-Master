/* Ferramentas ENEM: conteúdos da prova, contagem regressiva, pesos por área,
   simulado por área, desempenho por área e apoio à redação. Usa os dados já existentes. */
(() => {
    'use strict';
    const Areas = () => window.KingEnemAreas;
    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
    const data = () => (typeof appData !== 'undefined' ? appData : {});
    const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const toast = (msg, erro) => window.showToast?.(msg, erro);

    /* ---------- Conteúdos frequentes do ENEM por matéria ---------- */
    const CONTEUDOS = [
        { area: 'linguagens', materia: 'Português', cor: '#d9480f', icone: 'Aa', topicos: ['Interpretação de texto', 'Gêneros textuais', 'Funções da linguagem', 'Variação linguística', 'Figuras de linguagem', 'Coesão e coerência', 'Classes de palavras', 'Concordância e regência', 'Pontuação e crase', 'Intertextualidade'] },
        { area: 'linguagens', materia: 'Literatura', cor: '#e8590c', icone: '✦', topicos: ['Quinhentismo e Barroco', 'Arcadismo', 'Romantismo', 'Realismo e Naturalismo', 'Parnasianismo e Simbolismo', 'Pré-Modernismo', 'Modernismo: 1ª fase', 'Modernismo: 2ª e 3ª fases', 'Literatura contemporânea'] },
        { area: 'linguagens', materia: 'Língua Estrangeira', cor: '#f08c00', icone: '●', topicos: ['Interpretação de texto em língua estrangeira', 'Vocabulário em contexto', 'Gêneros textuais em língua estrangeira'] },
        { area: 'linguagens', materia: 'Artes', cor: '#f76707', icone: '◈', topicos: ['Arte e cultura brasileira', 'Vanguardas europeias', 'Arte contemporânea', 'Música, dança e teatro'] },
        { area: 'linguagens', materia: 'Educação Física', cor: '#fd7e14', icone: '●', topicos: ['Práticas corporais e saúde', 'Esporte, cultura e sociedade'] },
        { area: 'humanas', materia: 'História', cor: '#9c36b5', icone: '●', topicos: ['Antiguidade clássica', 'Idade Média', 'Expansão marítima e colonização', 'Brasil Colônia', 'Escravidão e resistência', 'Brasil Império', 'Revoluções Industrial e Francesa', 'República Velha', 'Era Vargas', 'Guerras mundiais', 'Guerra Fria', 'Ditadura militar', 'Redemocratização e Brasil atual'] },
        { area: 'humanas', materia: 'Geografia', cor: '#ae3ec9', icone: '◍', topicos: ['Cartografia', 'Clima', 'Relevo e solos', 'Hidrografia', 'Biomas brasileiros', 'Questões ambientais', 'População', 'Urbanização', 'Agropecuária', 'Industrialização e energia', 'Globalização', 'Geopolítica'] },
        { area: 'humanas', materia: 'Filosofia', cor: '#862e9c', icone: '●', topicos: ['Filosofia antiga', 'Ética', 'Contratualistas: Hobbes, Locke e Rousseau', 'Racionalismo e empirismo', 'Iluminismo e Kant', 'Filosofia contemporânea'] },
        { area: 'humanas', materia: 'Sociologia', cor: '#be4bdb', icone: '●', topicos: ['Durkheim, Weber e Marx', 'Cultura e identidade', 'Trabalho e sociedade', 'Desigualdade social', 'Movimentos sociais', 'Cidadania e direitos humanos'] },
        { area: 'natureza', materia: 'Biologia', cor: '#2f9e44', icone: '●', topicos: ['Ecologia', 'Citologia', 'Bioquímica', 'Genética', 'Evolução', 'Fisiologia humana', 'Botânica', 'Zoologia', 'Microbiologia e doenças', 'Biotecnologia'] },
        { area: 'natureza', materia: 'Química', cor: '#0ca678', icone: '◈', topicos: ['Propriedades da matéria', 'Separação de misturas', 'Atomística', 'Tabela periódica e ligações químicas', 'Funções inorgânicas', 'Estequiometria', 'Soluções', 'Termoquímica', 'Cinética química', 'Equilíbrio químico', 'Eletroquímica', 'Química orgânica', 'Química ambiental'] },
        { area: 'natureza', materia: 'Física', cor: '#099268', icone: '∑', topicos: ['Cinemática', 'Leis de Newton', 'Trabalho, energia e potência', 'Hidrostática', 'Termologia', 'Ondulatória', 'Óptica', 'Eletrostática', 'Eletrodinâmica', 'Magnetismo', 'Física moderna'] },
        { area: 'matematica', materia: 'Matemática', cor: '#1c7ed6', icone: '∑', topicos: ['Razão e proporção', 'Porcentagem', 'Regra de três', 'Grandezas e unidades de medida', 'Escalas', 'Leitura de gráficos e tabelas', 'Função afim', 'Função quadrática', 'Funções exponencial e logarítmica', 'Progressões', 'Geometria plana', 'Geometria espacial', 'Trigonometria', 'Estatística', 'Probabilidade', 'Análise combinatória', 'Matemática financeira'] },
    ];

    /* Modal simples reaproveitando o visual de modais do site. */
    function modal(id, titulo, kicker, corpo, rodape) {
        document.getElementById(id)?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay enem-tool-modal';
        overlay.id = id;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', `${id}Title`);
        overlay.innerHTML = `<div class="modal-box"><button type="button" class="modal-close" data-close aria-label="Fechar">×</button><span class="workspace-kicker">${esc(kicker)}</span><h2 id="${id}Title">${esc(titulo)}</h2><div class="enem-tool-body">${corpo}</div><div class="enem-tool-actions">${rodape}</div></div>`;
        overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-close]')) overlay.remove(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });
        document.body.append(overlay);
        requestAnimationFrame(() => { overlay.classList.add('active'); overlay.querySelector('input, select, button:not([data-close])')?.focus(); });
        return overlay;
    }

    function acharMateria(nome) {
        const alvo = norm(nome);
        return (data().cycleItems || []).find(item => norm(item.subject) === alvo);
    }

    function abrirConteudos() {
        const grupos = ['linguagens', 'humanas', 'natureza', 'matematica'].map(area => {
            const itens = CONTEUDOS.filter(item => item.area === area).map(item => {
                const existente = acharMateria(item.materia);
                const chaves = new Set((existente?.topicos || []).map(t => norm(t.nome)));
                const novos = item.topicos.filter(t => !chaves.has(norm(t))).length;
                const legenda = existente ? (novos ? `+${novos} assuntos na sua matéria` : 'Já tem todos') : `Nova matéria · ${item.topicos.length} assuntos`;
                return `<label class="enem-content-option"><input type="checkbox" value="${esc(item.materia)}" ${novos ? 'checked' : 'disabled'}><span><strong>${esc(item.materia)}</strong><small>${esc(legenda)}</small></span></label>`;
            }).join('');
            return `<fieldset class="enem-content-group"><legend>${esc(Areas()?.AREAS[area]?.curto || area)}</legend>${itens}</fieldset>`;
        }).join('');
        const overlay = modal('enemContentModal', 'Carregar conteúdos do ENEM', 'ÁREAS DO ENEM',
            `<p class="enem-tool-intro">Escolha as matérias. Os assuntos mais cobrados entram nas matérias que você já tem, sem repetir nem apagar nada. Matérias que faltam são criadas.</p><div class="enem-content-grid">${grupos}</div>`,
            '<button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-apply>Adicionar conteúdos</button>');
        overlay.querySelector('[data-apply]').addEventListener('click', () => {
            const escolhidas = [...overlay.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
            if (!escolhidas.length) return toast('Escolha ao menos uma matéria.', true);
            const resultado = aplicarConteudos(escolhidas);
            overlay.remove();
            toast(`📚 ${resultado.assuntos} assuntos adicionados${resultado.materias ? ` e ${resultado.materias} matérias criadas` : ''}.`);
        });
    }

    function aplicarConteudos(nomes) {
        const d = data();
        let materias = 0, assuntos = 0;
        let proximoId = Date.now();
        for (const nome of nomes) {
            const modelo = CONTEUDOS.find(item => item.materia === nome);
            if (!modelo) continue;
            let materia = acharMateria(nome);
            if (!materia) {
                materia = { id: proximoId++, color: modelo.cor, subject: modelo.materia, area: modelo.area, schedule: { icon: modelo.icone, priority: 2, weeklyBlocks: 0, consecutive: false }, targetMin: 0, executedMin: 0, temas: [], topicos: [], questoes: 0, acertos: 0, erros: 0 };
                d.cycleItems.push(materia);
                materias++;
            }
            if (!Array.isArray(materia.topicos)) materia.topicos = [];
            const chaves = new Set(materia.topicos.map(t => norm(t.nome)));
            for (const nomeTopico of modelo.topicos) {
                if (chaves.has(norm(nomeTopico))) continue;
                chaves.add(norm(nomeTopico));
                materia.topicos.push({ id: window.KingTopicCore?.makeId('assunto') || `assunto-${Date.now()}-${Math.random().toString(36).slice(2)}`, nome: nomeTopico, temaId: '', concluido: false });
                assuntos++;
            }
        }
        window.saveAppData?.();
        window.renderizarCiclo?.();
        Areas()?.renderBanner?.();
        window.KingSchedule?.render?.();
        return { materias, assuntos };
    }

    /* ---------- Contagem regressiva e meta no Início ---------- */
    function renderMeta() {
        const box = document.getElementById('enemGoalCard');
        if (!box) return;
        const plano = data().studentPlan || {};
        const hoje = hojeIso();
        const datas = [plano.examDate, plano.examDate2].filter(valor => /^\d{4}-\d{2}-\d{2}$/.test(valor || '') && valor >= hoje).sort();
        const prova = datas[0];
        const dias = prova ? Math.round((new Date(`${prova}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 86400000) : null;
        const prazo = (data().prazos || []).filter(item => item.data && item.data >= hoje && !item.concluido).sort((a, b) => a.data.localeCompare(b.data))[0];
        const dataBr = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replaceAll('.', '');
        const contagem = dias === null
            ? '<div class="enem-goal-count is-empty"><strong>—</strong><span>Defina a data da prova</span></div>'
            : `<div class="enem-goal-count"><strong>${dias}</strong><span>${dias === 1 ? 'dia' : 'dias'} até a prova</span><small>${esc(dataBr(prova))}</small></div>`;
        const meta = [
            ['Curso desejado', plano.course || 'Não definido'],
            ['Nota que você busca', plano.target || 'Não definida'],
            ['Próximo prazo', prazo ? `${prazo.titulo} · ${dataBr(prazo.data)}` : 'Nenhum prazo próximo'],
        ].map(([rotulo, valor]) => `<div><dt>${esc(rotulo)}</dt><dd>${esc(valor)}</dd></div>`).join('');
        box.innerHTML = `${contagem}<dl class="enem-goal-meta">${meta}</dl><button type="button" class="cycle-btn" onclick="KingStudyEvolution.openProfile()">${plano.configured ? 'Ajustar meta' : 'Definir minha meta'}</button>`;
    }

    /* ---------- Pesos por área (orienta a distribuição da semana) ---------- */
    const PRESETS = {
        equilibrado: { nome: 'Equilibrado', pesos: { linguagens: 3, humanas: 3, natureza: 3, matematica: 3 } },
        saude: { nome: 'Saúde (Medicina, Enfermagem…)', pesos: { linguagens: 3, humanas: 2, natureza: 5, matematica: 3 } },
        exatas: { nome: 'Exatas e Engenharias', pesos: { linguagens: 2, humanas: 2, natureza: 4, matematica: 5 } },
        humanas: { nome: 'Humanas (Direito, Psicologia…)', pesos: { linguagens: 4, humanas: 5, natureza: 2, matematica: 2 } },
        linguagens: { nome: 'Letras e Comunicação', pesos: { linguagens: 5, humanas: 4, natureza: 2, matematica: 2 } },
    };

    function abrirPesos() {
        const plano = data().studentPlan || {};
        const atual = plano.areaWeights || PRESETS.equilibrado.pesos;
        const linhas = ['linguagens', 'humanas', 'natureza', 'matematica'].map(area => `<label class="enem-weight-row"><span>${esc(Areas()?.AREAS[area]?.nome || area)}</span><select class="cycle-input" data-area-weight="${area}">${[1, 2, 3, 4, 5].map(peso => `<option value="${peso}" ${Number(atual[area]) === peso ? 'selected' : ''}>${peso}</option>`).join('')}</select></label>`).join('');
        const presets = Object.entries(PRESETS).map(([id, item]) => `<button type="button" class="enem-preset" data-preset="${id}">${esc(item.nome)}</button>`).join('');
        const overlay = modal('enemWeightsModal', 'Pesos das áreas na sua semana', 'PLANO SEMANAL',
            `<p class="enem-tool-intro">Áreas com peso maior ganham mais tempo no plano da semana. Os pesos reais variam por curso e universidade no SISU: confira os do seu curso e ajuste aqui.</p><div class="enem-presets">${presets}</div>${linhas}`,
            '<button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-apply>Aplicar pesos</button>');
        overlay.querySelectorAll('[data-preset]').forEach(botao => botao.addEventListener('click', () => {
            const pesos = PRESETS[botao.dataset.preset].pesos;
            overlay.querySelectorAll('[data-area-weight]').forEach(select => { select.value = String(pesos[select.dataset.areaWeight]); });
        }));
        overlay.querySelector('[data-apply]').addEventListener('click', () => {
            const pesos = Object.fromEntries([...overlay.querySelectorAll('[data-area-weight]')].map(select => [select.dataset.areaWeight, Number(select.value) || 3]));
            const d = data();
            d.studentPlan = { ...(d.studentPlan || {}), areaWeights: pesos, weights: { ...(d.studentPlan?.weights || {}) } };
            let ajustadas = 0;
            for (const materia of d.cycleItems || []) {
                const area = Areas()?.areaOf(materia);
                if (!pesos[area]) continue;
                d.studentPlan.weights[materia.id] = pesos[area];
                ajustadas++;
            }
            window.saveAppData?.();
            window.KingStudyEvolution?.render?.();
            window.KingSchedule?.render?.();
            overlay.remove();
            toast(`Pesos aplicados a ${ajustadas} matérias.`);
        });
    }

    /* ---------- Simulado ENEM registrado por área ---------- */
    function abrirSimuladoEnem() {
        const areasDia = { 1: ['linguagens', 'humanas'], 2: ['natureza', 'matematica'] };
        const linhas = dia => areasDia[dia].map(area => `<div class="enem-mock-row"><strong>${esc(Areas()?.AREAS[area]?.curto)}</strong><label>Acertos<input type="number" class="cycle-input" min="0" max="45" value="0" data-hits="${area}"></label><label>Em branco<input type="number" class="cycle-input" min="0" max="45" value="0" data-blank="${area}"></label></div>`).join('');
        const overlay = modal('enemMockModal', 'Registrar simulado ENEM', 'TREINO DE PROVA',
            `<p class="enem-tool-intro">Cada área tem 45 questões. O resultado entra nos seus simulados separado por área, para mostrar onde você está mais forte e mais fraco.</p>
            <div class="form-grid three"><label class="cycle-form-group"><span class="cycle-label">Dia da prova</span><select class="cycle-input" data-day><option value="1">1º dia (Linguagens e Humanas)</option><option value="2">2º dia (Natureza e Matemática)</option></select></label><label class="cycle-form-group"><span class="cycle-label">Data</span><input type="date" class="cycle-input" data-date value="${hojeIso()}"></label><label class="cycle-form-group"><span class="cycle-label">Tempo usado (min)</span><input type="number" class="cycle-input" min="1" max="400" value="330" data-time></label></div>
            <label class="cycle-form-group"><span class="cycle-label">Nome</span><input class="cycle-input" data-title maxlength="80" placeholder="Ex.: ENEM 2024 — 1º dia"></label>
            <div data-rows>${linhas(1)}</div>`,
            '<button type="button" class="cycle-btn" data-close>Cancelar</button><button type="button" class="cycle-btn primary" data-apply>Salvar resultado</button>');
        const dia = overlay.querySelector('[data-day]');
        dia.addEventListener('change', () => {
            overlay.querySelector('[data-rows]').innerHTML = linhas(dia.value);
            overlay.querySelector('[data-time]').value = dia.value === '1' ? 330 : 300;
        });
        overlay.querySelector('[data-apply]').addEventListener('click', () => {
            const d = data();
            const date = overlay.querySelector('[data-date]').value || hojeIso();
            const tempo = Math.max(1, Number(overlay.querySelector('[data-time]').value) || 1);
            const titulo = overlay.querySelector('[data-title]').value.trim() || `Simulado ENEM — ${dia.value}º dia`;
            const registros = [];
            for (const area of areasDia[dia.value]) {
                const acertos = Math.max(0, Math.min(45, Number(overlay.querySelector(`[data-hits="${area}"]`).value) || 0));
                const brancos = Math.max(0, Math.min(45, Number(overlay.querySelector(`[data-blank="${area}"]`).value) || 0));
                if (acertos + brancos > 45) return toast(`${Areas()?.AREAS[area]?.curto}: acertos e brancos passam de 45.`, true);
                const materias = (d.cycleItems || []).filter(item => Areas()?.areaOf(item) === area).map(item => String(item.id));
                registros.push({ id: Date.now() + registros.length, title: `${titulo} · ${Areas()?.AREAS[area]?.curto}`, date, tempoMin: Math.round(tempo / 2), format: 'area', area: Areas()?.AREAS[area]?.nome, total: 45, acertos, brancos, erros: 45 - acertos - brancos, subjectIds: materias, preparation: '', mainError: '', weakTopics: '', nextStep: '', attachment: '' });
            }
            d.simuladosItems = [...(d.simuladosItems || []), ...registros];
            window.saveAppData?.();
            window.renderizarSimulados?.();
            overlay.remove();
            toast('🎯 Simulado salvo por área.');
        });
    }

    /* ---------- Desempenho por área e assuntos com mais erros ---------- */
    function renderDesempenho() {
        const box = document.getElementById('enemPerformance');
        if (!box || !Areas()) return;
        const d = data();
        const linhas = ['linguagens', 'humanas', 'natureza', 'matematica'].map(area => {
            const materias = (d.cycleItems || []).filter(item => Areas().areaOf(item) === area);
            const acertos = materias.reduce((t, i) => t + Math.max(0, Number(i.acertos) || 0), 0);
            const erros = materias.reduce((t, i) => t + Math.max(0, Number(i.erros) || 0), 0);
            const minutos = materias.reduce((t, i) => t + Math.max(0, Number(i.executedMin) || 0), 0);
            const sims = (d.simuladosItems || []).filter(s => s.area === Areas().AREAS[area].nome && Number(s.total) > 0);
            const simTaxa = sims.length ? Math.round(sims.reduce((t, s) => t + Number(s.acertos || 0), 0) / sims.reduce((t, s) => t + Number(s.total || 0), 0) * 100) : null;
            const taxa = acertos + erros ? Math.round(acertos / (acertos + erros) * 100) : null;
            return { area, acertos, erros, minutos, taxa, simTaxa, cor: Areas().AREAS[area].cor, nome: Areas().AREAS[area].curto };
        });
        const tempo = m => m >= 60 ? `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}` : `${Math.round(m)}min`;
        const cards = linhas.map(l => `<article class="enem-perf-card" style="--area-color:${l.cor}"><header><span>${esc(l.nome)}</span><strong>${l.taxa === null ? '—' : `${l.taxa}%`}</strong></header><div class="subject-card-bar"><span style="width:${l.taxa || 0}%"></span></div><dl><div><dt>Questões</dt><dd>${l.acertos + l.erros}</dd></div><div><dt>Tempo</dt><dd>${tempo(l.minutos)}</dd></div><div><dt>Simulados</dt><dd>${l.simTaxa === null ? '—' : `${l.simTaxa}%`}</dd></div></dl></article>`).join('');
        const porAssunto = new Map();
        const somar = (materia, assunto, erros, acertos) => {
            if (!assunto) return;
            const chave = `${norm(materia)}|${norm(assunto)}`;
            const atual = porAssunto.get(chave) || { materia, assunto, erros: 0, acertos: 0 };
            atual.erros += erros; atual.acertos += acertos;
            porAssunto.set(chave, atual);
        };
        (d.historyItems || []).forEach(item => somar(item.materia, item.assunto, Math.max(0, Number(item.erros) || 0), Math.max(0, Number(item.acertos) || 0)));
        (d.cadernoErrosItems || []).filter(item => item?.status !== 'dominado').forEach(item => somar(item.materia, item.assunto, 1, 0));
        const piores = [...porAssunto.values()].filter(item => item.erros > 0).sort((a, b) => b.erros - a.erros || a.acertos - b.acertos).slice(0, 5);
        const lista = piores.length
            ? `<ol class="enem-worst-list">${piores.map(item => `<li><span><strong>${esc(item.assunto)}</strong><small>${esc(item.materia || 'Sem matéria')}</small></span><b>${item.erros} ${item.erros === 1 ? 'erro' : 'erros'}</b></li>`).join('')}</ol>`
            : '<p class="enem-tool-intro">Registre questões nas sessões ou no Caderno de Erros para ver aqui os assuntos que mais pedem atenção.</p>';
        box.innerHTML = `<div class="enem-perf-head"><div><span class="workspace-kicker">DESEMPENHO POR ÁREA</span><h2>Onde você está na prova</h2></div></div><div class="enem-perf-grid">${cards}</div><div class="enem-worst"><h3>Assuntos que mais pedem atenção</h3>${lista}</div>`;
    }

    /* ---------- Redação: competências e temas ---------- */
    const COMPETENCIAS = [
        ['Norma padrão', ['Revisei ortografia e acentuação', 'Concordância e regência estão certas', 'Pontuação ajuda a leitura']],
        ['Tema e repertório', ['Abordei o tema completo, sem tangenciar', 'O texto é dissertativo-argumentativo', 'Usei repertório pertinente e ligado à discussão']],
        ['Argumentação', ['A tese aparece clara na introdução', 'Cada argumento é desenvolvido e explicado', 'O texto segue um projeto, sem contradições']],
        ['Coesão', ['Usei conectivos variados entre os parágrafos', 'Há conectivos dentro dos parágrafos', 'Evitei repetir palavras']],
        ['Proposta de intervenção', ['Agente: quem vai fazer', 'Ação e meio/modo: o que e como', 'Finalidade e detalhamento', 'Respeita os direitos humanos']],
    ];
    const TEMAS = [
        [2024, 'Desafios para a valorização da herança africana no Brasil'],
        [2023, 'Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil'],
        [2022, 'Desafios para a valorização de comunidades e povos tradicionais no Brasil'],
        [2021, 'Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil'],
        [2020, 'O estigma associado às doenças mentais na sociedade brasileira'],
        [2019, 'Democratização do acesso ao cinema no Brasil'],
        [2018, 'Manipulação do comportamento do usuário pelo controle de dados na internet'],
        [2017, 'Desafios para a formação educacional de surdos no Brasil'],
        [2016, 'Caminhos para combater a intolerância religiosa no Brasil'],
        [2015, 'A persistência da violência contra a mulher na sociedade brasileira'],
        [2014, 'Publicidade infantil em questão no Brasil'],
        [2013, 'Efeitos da implantação da Lei Seca no Brasil'],
    ];

    function renderRedacao() {
        const box = document.getElementById('enemWritingTools');
        if (!box || box.dataset.ready) return;
        box.dataset.ready = '1';
        const checklist = COMPETENCIAS.map(([nome, itens], i) => `<fieldset class="enem-check-group"><legend><b>C${i + 1}</b> ${esc(nome)}</legend>${itens.map(item => `<label><input type="checkbox"> ${esc(item)}</label>`).join('')}</fieldset>`).join('');
        const temas = TEMAS.map(([ano, tema]) => `<li><span><b>${ano}</b> ${esc(tema)}</span><button type="button" class="cycle-btn" data-tema="${esc(tema)}">Treinar</button></li>`).join('');
        box.innerHTML = `<details class="widget enem-writing-card" open><summary><span class="workspace-kicker">ANTES DE ENTREGAR</span><h2>Checklist das 5 competências</h2></summary><div class="enem-check-grid">${checklist}</div><button type="button" class="subjects-clear-link" data-reset>Limpar checklist</button></details>
            <details class="widget enem-writing-card"><summary><span class="workspace-kicker">BANCO DE TEMAS</span><h2>Temas das últimas edições do ENEM</h2></summary><ul class="enem-theme-list">${temas}</ul></details>`;
        box.querySelector('[data-reset]').addEventListener('click', () => box.querySelectorAll('.enem-check-grid input').forEach(input => { input.checked = false; }));
        box.querySelectorAll('[data-tema]').forEach(botao => botao.addEventListener('click', () => {
            window.abrirModalRedacao?.();
            setTimeout(() => { const campo = document.getElementById('redTheme'); if (campo) { campo.value = botao.dataset.tema; campo.dispatchEvent(new Event('input', { bubbles: true })); } }, 60);
        }));
    }

    function onSection(id) {
        if (id === 'dashboard') renderMeta();
        if (id === 'historico') renderDesempenho();
        if (id === 'redacao') renderRedacao();
    }
    window.addEventListener('king-master-section', event => onSection(event.detail));
    window.addEventListener('king-master-data-changed', () => {
        const ativa = document.querySelector('.content-section.active')?.id;
        if (ativa === 'dashboard') renderMeta();
        if (ativa === 'historico') renderDesempenho();
    });
    const inicial = () => onSection(document.querySelector('.content-section.active')?.id || 'dashboard');
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inicial, { once: true }); else setTimeout(inicial, 0);

    window.KingEnemTools = Object.freeze({ CONTEUDOS, aplicarConteudos, abrirConteudos, abrirPesos, abrirSimuladoEnem, renderMeta, renderDesempenho, renderRedacao });
})();

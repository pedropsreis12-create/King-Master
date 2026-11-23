/* Metas: o estudante cria metas e acompanha o progresso.
   - automáticas: medidas pelos registros (horas, questões, acerto, redações, simulados)
   - marcar feito: com subtarefas opcionais
   - número: o estudante atualiza o valor
   Cada meta vale para hoje, a semana, o mês ou até uma data; semanais e mensais podem se repetir. */
(() => {
    'use strict';
    // O Inep ainda não publicou o edital de 2027: datas previstas pelo padrão de 2026 (1º e 2º domingos de novembro).
    const ENEM_PREVISTO = Object.freeze({ ano: 2027, dia1: '2027-11-07', dia2: '2027-11-14', oficial: false });
    const METRICAS = Object.freeze({
        horas: { nome: 'Horas de estudo', unidade: 'h', sufixo: 'h de estudo' },
        questoes: { nome: 'Questões feitas', unidade: '', sufixo: 'questões' },
        acerto: { nome: 'Taxa de acerto', unidade: '%', sufixo: '% de acerto' },
        redacoes: { nome: 'Redações escritas', unidade: '', sufixo: 'redações' },
        simulados: { nome: 'Simulados feitos', unidade: '', sufixo: 'simulados' },
    });
    const PERIODOS = Object.freeze({ hoje: 'Hoje', semana: 'Esta semana', mes: 'Este mês', data: 'Até uma data' });
    const SUGESTOES = [
        { titulo: '20h de estudo nesta semana', tipo: 'auto', metrica: 'horas', alvo: 20, periodo: 'semana', repetir: true },
        { titulo: '300 questões no mês', tipo: 'auto', metrica: 'questoes', alvo: 300, periodo: 'mes', repetir: true },
        { titulo: '70% de acerto em Matemática', tipo: 'auto', metrica: 'acerto', alvo: 70, periodo: 'mes', repetir: true, filtro: 'area:matematica' },
        { titulo: '1 redação por semana', tipo: 'auto', metrica: 'redacoes', alvo: 1, periodo: 'semana', repetir: true },
        { titulo: '1 simulado por mês', tipo: 'auto', metrica: 'simulados', alvo: 1, periodo: 'mes', repetir: true },
    ];

    const esc = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = texto => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR').trim();
    const dados = () => (typeof appData !== 'undefined' ? appData : {});
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hoje = () => iso(new Date());
    const dataBr = valor => new Date(`${valor}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replaceAll('.', '');
    const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);
    const novoId = () => `meta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const toast = (msg, erro) => window.showToast?.(msg, erro);

    function lista() {
        const d = dados();
        if (!Array.isArray(d.metas)) d.metas = [];
        return d.metas;
    }

    function janela(meta, referencia = new Date()) {
        const base = new Date(referencia); base.setHours(12, 0, 0, 0);
        if (meta.periodo === 'hoje') { const dia = meta.repetir ? iso(base) : (meta.inicio || iso(base)); return { inicio: dia, fim: dia }; }
        if (meta.periodo === 'semana') {
            const ref = meta.repetir ? base : new Date(`${meta.inicio || iso(base)}T12:00:00`);
            const segunda = new Date(ref); segunda.setDate(ref.getDate() - ((ref.getDay() + 6) % 7));
            const domingo = new Date(segunda); domingo.setDate(segunda.getDate() + 6);
            return { inicio: iso(segunda), fim: iso(domingo) };
        }
        if (meta.periodo === 'mes') {
            const ref = meta.repetir ? base : new Date(`${meta.inicio || iso(base)}T12:00:00`);
            return { inicio: iso(new Date(ref.getFullYear(), ref.getMonth(), 1, 12)), fim: iso(new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12)) };
        }
        return { inicio: meta.inicio || iso(base), fim: meta.prazo || iso(base) };
    }

    function materiaCombina(nomeMateria, filtro) {
        if (!filtro) return true;
        const [tipo, valor] = String(filtro).split(':');
        const materia = (dados().cycleItems || []).find(item => norm(item.subject) === norm(nomeMateria));
        if (tipo === 'area') return materia ? window.KingEnemAreas?.areaOf(materia) === valor : false;
        if (tipo === 'materia') return materia ? String(materia.id) === valor : false;
        return true;
    }

    function medir(meta, referencia) {
        const { inicio, fim } = janela(meta, referencia);
        const dentro = valor => valor && valor >= inicio && valor <= fim;
        const d = dados();
        const sessoes = (d.historyItems || []).filter(item => dentro(typeof dataHistoricoISO === 'function' ? dataHistoricoISO(item) : item.dataISO) && materiaCombina(item.materia, meta.filtro));
        const num = valor => Math.max(0, Number(valor) || 0);
        if (meta.metrica === 'horas') return Math.round(sessoes.reduce((t, s) => t + num(s.tempoSegundos), 0) / 360) / 10;
        const simulados = (d.simuladosItems || []).filter(item => item.format !== 'sessao' && dentro(item.date) && (!meta.filtro || !meta.filtro.startsWith('area:') || item.area === window.KingEnemAreas?.AREAS[meta.filtro.slice(5)]?.nome));
        if (meta.metrica === 'questoes') return sessoes.reduce((t, s) => t + Math.max(num(s.questoes), num(s.acertos) + num(s.erros)), 0) + (meta.filtro?.startsWith('materia:') ? 0 : simulados.reduce((t, s) => t + num(s.total), 0));
        if (meta.metrica === 'acerto') {
            const acertos = sessoes.reduce((t, s) => t + num(s.acertos), 0) + (meta.filtro?.startsWith('materia:') ? 0 : simulados.reduce((t, s) => t + num(s.acertos), 0));
            const erros = sessoes.reduce((t, s) => t + num(s.erros), 0) + (meta.filtro?.startsWith('materia:') ? 0 : simulados.reduce((t, s) => t + num(s.erros), 0));
            return acertos + erros ? Math.round(acertos / (acertos + erros) * 100) : null;
        }
        if (meta.metrica === 'redacoes') return (d.redacaoItems || []).filter(item => dentro(item.date)).length;
        if (meta.metrica === 'simulados') return simulados.length;
        return 0;
    }

    function progresso(meta) {
        if (meta.tipo === 'check') {
            const sub = Array.isArray(meta.subtarefas) ? meta.subtarefas : [];
            if (meta.feito) return { atual: 1, alvo: 1, pct: 100, texto: 'Concluída' };
            if (sub.length) { const feitas = sub.filter(s => s.feito).length; return { atual: feitas, alvo: sub.length, pct: Math.round(feitas / sub.length * 100), texto: `${feitas} de ${sub.length} etapas` }; }
            return { atual: 0, alvo: 1, pct: 0, texto: 'A fazer' };
        }
        const alvo = Math.max(0.1, Number(meta.alvo) || 1);
        const atual = meta.tipo === 'numero' ? Math.max(0, Number(meta.atual) || 0) : medir(meta);
        const unidade = meta.tipo === 'numero' ? (meta.unidade ? ` ${meta.unidade}` : '') : (METRICAS[meta.metrica]?.unidade === 'h' ? 'h' : METRICAS[meta.metrica]?.unidade || '');
        if (atual === null) return { atual: 0, alvo, pct: 0, texto: `Sem questões no período · meta ${alvo}${unidade}` };
        const fmt = valor => String(valor).replace('.', ',');
        return { atual, alvo, pct: Math.min(100, Math.round(atual / alvo * 100)), texto: meta.tipo === 'numero' ? `${fmt(atual)} de ${fmt(alvo)}${unidade}` : `${fmt(atual)}${unidade} de ${fmt(alvo)}${unidade}` };
    }

    function situacao(meta) {
        const p = progresso(meta);
        const { fim } = janela(meta);
        if (p.pct >= 100) return 'cumprida';
        if (!meta.repetir && fim < hoje()) return 'expirada';
        return 'ativa';
    }

    function rotuloPrazo(meta) {
        const { inicio, fim } = janela(meta);
        const restantes = diasEntre(hoje(), fim);
        const base = meta.periodo === 'data' ? `até ${dataBr(fim)}` : meta.periodo === 'hoje' ? 'hoje' : `${dataBr(inicio)} – ${dataBr(fim)}`;
        const repete = meta.repetir && meta.periodo !== 'data' ? ` · repete ${meta.periodo === 'semana' ? 'toda semana' : meta.periodo === 'mes' ? 'todo mês' : 'todo dia'}` : '';
        const falta = restantes > 0 ? ` · ${restantes} ${restantes === 1 ? 'dia' : 'dias'} restantes` : restantes === 0 ? ' · termina hoje' : '';
        return `${base}${repete}${situacao(meta) === 'ativa' ? falta : ''}`;
    }

    let filtroAtual = 'ativas';

    function cartao(meta) {
        const p = progresso(meta);
        const estado = situacao(meta);
        const tipo = meta.tipo === 'auto' ? `Automática · ${METRICAS[meta.metrica]?.nome || ''}` : meta.tipo === 'check' ? 'Marcar feito' : 'Número';
        const filtro = meta.filtro ? (meta.filtro.startsWith('area:') ? window.KingEnemAreas?.AREAS[meta.filtro.slice(5)]?.curto : (dados().cycleItems || []).find(item => `materia:${item.id}` === meta.filtro)?.subject) : '';
        let controles = '';
        if (meta.tipo === 'check') {
            const sub = Array.isArray(meta.subtarefas) ? meta.subtarefas : [];
            controles = (sub.length ? `<ul class="meta-subtasks">${sub.map(s => `<li><label><input type="checkbox" data-sub="${esc(meta.id)}:${esc(s.id)}" ${s.feito ? 'checked' : ''}> <span>${esc(s.texto)}</span></label></li>`).join('')}</ul>` : '')
                + `<button type="button" class="cycle-btn ${meta.feito ? '' : 'primary'}" data-toggle-done="${esc(meta.id)}">${meta.feito ? 'Desmarcar' : 'Marcar como feita'}</button>`;
        } else if (meta.tipo === 'numero') {
            controles = `<div class="meta-number"><button type="button" class="cycle-btn" data-step="${esc(meta.id)}:-1" aria-label="Diminuir">−</button><input type="number" class="cycle-input" value="${esc(meta.atual || 0)}" data-set="${esc(meta.id)}" aria-label="Valor atual de ${esc(meta.titulo)}"><button type="button" class="cycle-btn" data-step="${esc(meta.id)}:1" aria-label="Aumentar">+</button></div>`;
        }
        return `<article class="meta-card is-${estado}">
            <header><div><h3>${esc(meta.titulo)}</h3><span class="meta-type">${esc(tipo)}${filtro ? ` · ${esc(filtro)}` : ''}</span></div>
                <div class="meta-card-menu"><button type="button" data-edit="${esc(meta.id)}" aria-label="Editar ${esc(meta.titulo)}" title="Editar">✎</button><button type="button" class="danger" data-delete="${esc(meta.id)}" aria-label="Apagar ${esc(meta.titulo)}" title="Apagar">×</button></div></header>
            <div class="meta-progress"><div class="meta-progress-row"><strong>${esc(p.texto)}</strong><span>${p.pct}%</span></div><div class="meta-bar"><span style="width:${p.pct}%"></span></div></div>
            <p class="meta-deadline">${estado === 'cumprida' ? '✓ Meta cumprida · ' : estado === 'expirada' ? 'Prazo encerrado · ' : ''}${esc(rotuloPrazo(meta))}</p>
            ${controles}
        </article>`;
    }

    function renderContagem() {
        const box = document.getElementById('metasEnemCountdown');
        if (!box) return;
        const plano = dados().studentPlan || {};
        const proprio = [plano.examDate, plano.examDate2].filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && v >= hoje()).sort();
        const dia1 = proprio[0] || ENEM_PREVISTO.dia1;
        const dia2 = proprio[1] || (proprio[0] ? '' : ENEM_PREVISTO.dia2);
        const previsto = !proprio.length;
        const faltam = diasEntre(hoje(), dia1);
        box.innerHTML = `<div class="metas-countdown-main"><strong>${faltam}</strong><span>${faltam === 1 ? 'dia' : 'dias'} para o ENEM ${previsto ? ENEM_PREVISTO.ano : ''}</span></div>
            <dl><div><dt>1º dia</dt><dd>${esc(new Date(`${dia1}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }))}</dd></div>${dia2 ? `<div><dt>2º dia</dt><dd>${esc(new Date(`${dia2}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }))}</dd></div>` : ''}</dl>
            <p>${previsto ? 'Previsão pelo padrão de 2026. O Inep ainda não publicou o edital de 2027; quando sair, ajuste em <button type="button" class="subjects-clear-link" onclick="KingStudyEvolution.openProfile()">Minha meta</button>.' : 'Datas definidas por você em <button type="button" class="subjects-clear-link" onclick="KingStudyEvolution.openProfile()">Minha meta</button>.'}</p>`;
    }

    function render() {
        const box = document.getElementById('metasLista');
        if (!box) return;
        renderContagem();
        const todas = lista();
        document.querySelectorAll('[data-metas-filtro]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.metasFiltro === filtroAtual)));
        const resumo = document.getElementById('metasResumo');
        const ativas = todas.filter(m => situacao(m) === 'ativa').length, cumpridas = todas.filter(m => situacao(m) === 'cumprida').length;
        if (resumo) resumo.textContent = `${ativas} em andamento · ${cumpridas} cumpridas`;
        const visiveis = todas.filter(meta => filtroAtual === 'todas' || (filtroAtual === 'ativas' ? situacao(meta) === 'ativa' : situacao(meta) !== 'ativa'));
        if (!todas.length) {
            box.innerHTML = `<div class="workspace-empty"><b aria-hidden="true">◎</b><strong>Crie sua primeira meta</strong><p>Escolha uma sugestão abaixo ou crie a sua.</p></div>`;
            return;
        }
        if (!visiveis.length) { box.innerHTML = `<p class="enem-tool-intro">Nenhuma meta neste filtro.</p>`; return; }
        const grupos = [['hoje', 'Hoje'], ['semana', 'Esta semana'], ['mes', 'Este mês'], ['data', 'Com prazo']];
        box.innerHTML = grupos.map(([periodo, titulo]) => {
            const doGrupo = visiveis.filter(m => m.periodo === periodo);
            return doGrupo.length ? `<section class="metas-group"><h2>${titulo}</h2><div class="metas-grid">${doGrupo.map(cartao).join('')}</div></section>` : '';
        }).join('');
    }

    function renderSugestoes() {
        const box = document.getElementById('metasSugestoes');
        if (!box) return;
        box.innerHTML = SUGESTOES.map((s, i) => `<button type="button" class="enem-preset" data-sugestao="${i}">+ ${esc(s.titulo)}</button>`).join('');
    }

    function salvar(mensagem) {
        window.saveAppData?.();
        render();
        if (mensagem) toast(mensagem);
    }

    function abrirEditor(id = '') {
        const meta = lista().find(m => m.id === id) || { tipo: 'auto', metrica: 'horas', alvo: 10, periodo: 'semana', repetir: true, titulo: '', subtarefas: [] };
        const materias = (dados().cycleItems || []).map(item => `<option value="materia:${esc(item.id)}" ${meta.filtro === `materia:${item.id}` ? 'selected' : ''}>${esc(item.subject)}</option>`).join('');
        const areas = Object.values(window.KingEnemAreas?.AREAS || {}).map(a => `<option value="area:${a.id}" ${meta.filtro === `area:${a.id}` ? 'selected' : ''}>${esc(a.curto)}</option>`).join('');
        document.getElementById('metaEditor')?.remove();
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay enem-tool-modal';
        overlay.id = 'metaEditor';
        overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true'); overlay.setAttribute('aria-labelledby', 'metaEditorTitle');
        overlay.innerHTML = `<form class="modal-box meta-form"><button type="button" class="modal-close" data-close aria-label="Fechar">×</button>
            <span class="workspace-kicker">METAS</span><h2 id="metaEditorTitle">${id ? 'Editar meta' : 'Nova meta'}</h2>
            <label class="cycle-form-group"><span class="cycle-label">Nome da meta</span><input class="cycle-input" name="titulo" maxlength="80" required value="${esc(meta.titulo)}" placeholder="Ex.: 20h de estudo nesta semana"></label>
            <div class="meta-type-switch" role="radiogroup" aria-label="Tipo de meta">
                ${[['auto', 'Automática', 'O site mede pelos seus registros'], ['check', 'Marcar feito', 'Você marca quando cumprir'], ['numero', 'Número', 'Você atualiza o valor']].map(([v, n, d]) => `<label><input type="radio" name="tipo" value="${v}" ${meta.tipo === v ? 'checked' : ''}><span><strong>${n}</strong><small>${d}</small></span></label>`).join('')}
            </div>
            <div class="form-grid three" data-show="auto"><label class="cycle-form-group"><span class="cycle-label">O que medir</span><select class="cycle-input" name="metrica">${Object.entries(METRICAS).map(([v, m]) => `<option value="${v}" ${meta.metrica === v ? 'selected' : ''}>${m.nome}</option>`).join('')}</select></label>
                <label class="cycle-form-group"><span class="cycle-label">Contar só</span><select class="cycle-input" name="filtro"><option value="">Tudo</option><optgroup label="Área">${areas}</optgroup><optgroup label="Matéria">${materias}</optgroup></select></label>
                <label class="cycle-form-group"><span class="cycle-label">Alvo</span><input type="number" class="cycle-input" name="alvo" min="0.5" step="0.5" value="${esc(meta.alvo ?? 10)}"></label></div>
            <div class="form-grid three" data-show="numero"><label class="cycle-form-group"><span class="cycle-label">Alvo</span><input type="number" class="cycle-input" name="alvoNumero" min="1" step="1" value="${esc(meta.alvo ?? 10)}"></label>
                <label class="cycle-form-group"><span class="cycle-label">Unidade (opcional)</span><input class="cycle-input" name="unidade" maxlength="20" value="${esc(meta.unidade || '')}" placeholder="Ex.: livros, pontos"></label>
                <label class="cycle-form-group"><span class="cycle-label">Valor atual</span><input type="number" class="cycle-input" name="atual" min="0" step="1" value="${esc(meta.atual || 0)}"></label></div>
            <label class="cycle-form-group" data-show="check"><span class="cycle-label">Etapas (opcional, uma por linha)</span><textarea class="cycle-input" name="subtarefas" rows="4" placeholder="Ex.:&#10;Ler a teoria&#10;Fazer 20 questões&#10;Revisar os erros">${esc((meta.subtarefas || []).map(s => s.texto).join('\n'))}</textarea></label>
            <div class="form-grid three"><label class="cycle-form-group"><span class="cycle-label">Período</span><select class="cycle-input" name="periodo">${Object.entries(PERIODOS).map(([v, n]) => `<option value="${v}" ${meta.periodo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
                <label class="cycle-form-group" data-show-prazo><span class="cycle-label">Prazo</span><input type="date" class="cycle-input" name="prazo" value="${esc(meta.prazo || ENEM_PREVISTO.dia1)}"></label>
                <label class="meta-repeat" data-show-repetir><input type="checkbox" name="repetir" ${meta.repetir ? 'checked' : ''}> Repetir automaticamente</label></div>
            <div class="enem-tool-actions"><button type="button" class="cycle-btn" data-close>Cancelar</button><button type="submit" class="cycle-btn primary">${id ? 'Salvar' : 'Criar meta'}</button></div></form>`;
        document.body.append(overlay);
        const form = overlay.querySelector('form');
        const sync = () => {
            const tipo = form.tipo.value;
            form.querySelectorAll('[data-show]').forEach(el => { el.hidden = el.dataset.show !== tipo; });
            form.querySelector('[data-show-prazo]').hidden = form.periodo.value !== 'data';
            form.querySelector('[data-show-repetir]').hidden = form.periodo.value === 'data';
        };
        form.addEventListener('change', sync); sync();
        overlay.addEventListener('click', event => { if (event.target === overlay || event.target.closest('[data-close]')) overlay.remove(); });
        overlay.addEventListener('keydown', event => { if (event.key === 'Escape') overlay.remove(); });
        form.addEventListener('submit', event => {
            event.preventDefault();
            const tipo = form.tipo.value;
            const periodo = form.periodo.value;
            const anteriores = new Map((meta.subtarefas || []).map(s => [norm(s.texto), s]));
            const nova = {
                ...meta, id: meta.id || novoId(), titulo: form.titulo.value.trim().slice(0, 80), tipo, periodo,
                repetir: periodo !== 'data' && form.repetir.checked,
                prazo: periodo === 'data' ? form.prazo.value : '',
                inicio: meta.inicio || hoje(), criadaEm: meta.criadaEm || Date.now(),
                metrica: tipo === 'auto' ? form.metrica.value : meta.metrica,
                filtro: tipo === 'auto' ? form.filtro.value : '',
                alvo: tipo === 'auto' ? Math.max(0.5, Number(form.alvo.value) || 1) : tipo === 'numero' ? Math.max(1, Number(form.alvoNumero.value) || 1) : 1,
                unidade: tipo === 'numero' ? form.unidade.value.trim().slice(0, 20) : '',
                atual: tipo === 'numero' ? Math.max(0, Number(form.atual.value) || 0) : meta.atual,
                subtarefas: tipo === 'check' ? form.subtarefas.value.split('\n').map(t => t.trim()).filter(Boolean).slice(0, 20).map(texto => anteriores.get(norm(texto)) || { id: novoId(), texto: texto.slice(0, 100), feito: false }) : [],
            };
            if (!nova.titulo) return toast('Dê um nome para a meta.', true);
            if (periodo === 'data' && !nova.prazo) return toast('Escolha o prazo da meta.', true);
            const todas = lista();
            const indice = todas.findIndex(m => m.id === nova.id);
            if (indice >= 0) todas[indice] = nova; else todas.push(nova);
            overlay.remove();
            salvar(indice >= 0 ? 'Meta atualizada.' : '🎯 Meta criada.');
        });
        requestAnimationFrame(() => { overlay.classList.add('active'); form.titulo.focus(); });
    }

    function onClick(event) {
        const alvo = event.target.closest('button, input[type="checkbox"]');
        if (!alvo || !alvo.closest('#metas')) return;
        const todas = lista();
        const acha = id => todas.find(m => m.id === id);
        if (alvo.dataset.metasFiltro) { filtroAtual = alvo.dataset.metasFiltro; render(); return; }
        if (alvo.dataset.sugestao) {
            const s = SUGESTOES[Number(alvo.dataset.sugestao)];
            todas.push({ ...s, id: novoId(), inicio: hoje(), criadaEm: Date.now(), subtarefas: [] });
            salvar('🎯 Meta criada.');
            return;
        }
        if (alvo.dataset.edit) { abrirEditor(alvo.dataset.edit); return; }
        if (alvo.dataset.delete) {
            const meta = acha(alvo.dataset.delete);
            if (meta && window.confirm(`Apagar a meta "${meta.titulo}"?`)) { dados().metas = todas.filter(m => m.id !== meta.id); salvar('Meta apagada.'); }
            return;
        }
        if (alvo.dataset.toggleDone) {
            const meta = acha(alvo.dataset.toggleDone);
            if (meta) { meta.feito = !meta.feito; meta.concluidaEm = meta.feito ? Date.now() : null; salvar(meta.feito ? '✓ Meta cumprida!' : ''); }
            return;
        }
        if (alvo.dataset.sub) {
            const [metaId, subId] = alvo.dataset.sub.split(':');
            const sub = acha(metaId)?.subtarefas?.find(s => s.id === subId);
            if (sub) { sub.feito = alvo.checked; salvar(); }
            return;
        }
        if (alvo.dataset.step) {
            const [metaId, passo] = alvo.dataset.step.split(':');
            const meta = acha(metaId);
            if (meta) { meta.atual = Math.max(0, (Number(meta.atual) || 0) + Number(passo)); salvar(); }
        }
    }

    function onChange(event) {
        const campo = event.target.closest('input[data-set]');
        if (!campo) return;
        const meta = lista().find(m => m.id === campo.dataset.set);
        if (meta) { meta.atual = Math.max(0, Number(campo.value) || 0); salvar(); }
    }

    function iniciar() {
        document.addEventListener('click', onClick);
        document.addEventListener('change', onChange);
        renderSugestoes();
        if (document.querySelector('#metas.active')) render();
    }
    window.addEventListener('king-master-section', event => { if (event.detail === 'metas') render(); });
    window.addEventListener('king-master-data-changed', () => { if (document.querySelector('#metas.active')) render(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true }); else iniciar();

    window.KingMetas = Object.freeze({ ENEM_PREVISTO, render, abrirEditor, medir, progresso, situacao, janela });
})();

/* Áreas do ENEM: agrupa as matérias cadastradas nas quatro áreas da prova sem alterar os dados existentes. */
(() => {
    const AREAS = Object.freeze({
        linguagens: { id: 'linguagens', curto: 'Linguagens', nome: 'Linguagens, Códigos e suas Tecnologias', dia: '1º dia', questoes: 45, cor: '#d9480f', resumo: 'Português, Literatura, Língua Estrangeira, Artes, Educação Física e Tecnologias da Informação.' },
        humanas: { id: 'humanas', curto: 'Humanas', nome: 'Ciências Humanas e suas Tecnologias', dia: '1º dia', questoes: 45, cor: '#9c36b5', resumo: 'História, Geografia, Filosofia e Sociologia.' },
        natureza: { id: 'natureza', curto: 'Natureza', nome: 'Ciências da Natureza e suas Tecnologias', dia: '2º dia', questoes: 45, cor: '#2f9e44', resumo: 'Biologia, Física e Química.' },
        matematica: { id: 'matematica', curto: 'Matemática', nome: 'Matemática e suas Tecnologias', dia: '2º dia', questoes: 45, cor: '#1c7ed6', resumo: 'Aritmética, Álgebra, Geometria, Estatística e Probabilidade.' },
    });
    const PALAVRAS = [
        ['matematica', /matemat|algebra|geometr|trigonom|estatist|probabil|aritmet|funcoes|funcao|logaritm|analise combinat|porcentag|razao e proporc/],
        ['natureza', /fisica|quimica|biolog|ecolog|genetic|citolog|botanic|zoolog|fisiolog|evoluc|ciencias da natureza|natureza/],
        ['humanas', /historia|geograf|filosof|sociolog|atualidad|ciencias humanas|humanas|geopolit/],
        ['linguagens', /portugu|literat|gramat|interpret|ingles|espanhol|lingua|linguagens|artes?\b|educacao fisica|redac/],
    ];
    const norm = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
    let atual = '';
    try { atual = AREAS[sessionStorage.getItem('kingMasterEnemArea')] ? sessionStorage.getItem('kingMasterEnemArea') : ''; } catch { atual = ''; }

    function areaOf(item) {
        if (item && AREAS[item.area]) return item.area;
        if (item?.area === 'outra') return 'outra';
        const nome = norm(item?.subject);
        return PALAVRAS.find(([, regra]) => regra.test(nome))?.[0] || 'outra';
    }

    const matches = item => !atual || areaOf(item) === atual;
    const escapar = texto => String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function resumoDaArea(materias) {
        const topicos = materias.flatMap(item => Array.isArray(item.topicos) ? item.topicos : []);
        const dominados = topicos.filter(item => (typeof obterNivelDominioTopico === 'function' ? obterNivelDominioTopico(item) : (item.concluido ? 3 : 0)) === 3).length;
        const acertos = materias.reduce((total, item) => total + Math.max(0, Number(item.acertos) || 0), 0);
        const erros = materias.reduce((total, item) => total + Math.max(0, Number(item.erros) || 0), 0);
        const minutos = materias.reduce((total, item) => total + Math.max(0, Number(item.executedMin) || 0), 0);
        return { topicos: topicos.length, dominados, questoes: acertos + erros, taxa: acertos + erros ? Math.round(acertos / (acertos + erros) * 100) : null, minutos };
    }

    function formatarMinutos(minutos) {
        const horas = Math.floor(minutos / 60);
        return horas ? `${horas}h${String(Math.round(minutos % 60)).padStart(2, '0')}` : `${Math.round(minutos)}min`;
    }

    function renderBanner() {
        const banner = document.getElementById('enemAreaBanner');
        const chips = document.getElementById('enemAreaChips');
        if (chips) chips.querySelectorAll('[data-enem-area-chip]').forEach(botao => botao.setAttribute('aria-pressed', String(botao.dataset.enemAreaChip === atual)));
        const titulo = document.getElementById('planejamentoTitulo');
        if (titulo) titulo.textContent = atual ? AREAS[atual].curto : 'Todas as matérias';
        if (!banner) return;
        if (!atual) { banner.hidden = true; banner.innerHTML = ''; return; }
        const area = AREAS[atual];
        const todas = Array.isArray(window.appData?.cycleItems) ? window.appData.cycleItems : (typeof appData !== 'undefined' && Array.isArray(appData.cycleItems) ? appData.cycleItems : []);
        const materias = todas.filter(item => areaOf(item) === atual);
        const dados = resumoDaArea(materias);
        banner.hidden = false;
        banner.style.setProperty('--area-color', area.cor);
        banner.innerHTML = `<div class="enem-area-banner-copy"><span class="workspace-kicker">${escapar(area.dia)} · ${area.questoes} questões</span><h2>${escapar(area.nome)}</h2><p>${escapar(area.resumo)}</p></div>
            <dl class="enem-area-stats">
                <div><dt>Matérias</dt><dd>${materias.length}</dd></div>
                <div><dt>Tópicos dominados</dt><dd>${dados.dominados}/${dados.topicos}</dd></div>
                <div><dt>Questões feitas</dt><dd>${dados.questoes}</dd></div>
                <div><dt>Acerto</dt><dd>${dados.taxa === null ? '—' : `${dados.taxa}%`}</dd></div>
                <div><dt>Tempo de estudo</dt><dd>${formatarMinutos(dados.minutos)}</dd></div>
            </dl>`;
    }

    function syncNav(sectionId) {
        document.querySelectorAll('.menu-btn[data-enem-area]').forEach(botao => {
            const ativa = sectionId === 'planejamento' && (botao.dataset.enemArea || '') === atual;
            botao.classList.toggle('active', ativa);
            if (ativa) botao.setAttribute('aria-current', 'page'); else botao.removeAttribute('aria-current');
        });
        if (sectionId === 'planejamento') document.title = `${atual ? AREAS[atual].curto : 'Todas as matérias'} · King Master`;
        if (sectionId === 'agendamento' || sectionId === 'cronograma') {
            document.title = `${sectionId === 'cronograma' ? 'Cronograma' : 'Compromissos e provas'} · King Master`;
            document.querySelector('.dock-btn[data-section="metas"]')?.classList.add('active');
            const plano = document.querySelector('.menu-btn[data-section="metas"]');
            plano?.classList.add('active');
            plano?.setAttribute('aria-current', 'page');
        }
        document.querySelectorAll('[data-plan-tab]').forEach(botao => botao.setAttribute('aria-selected', String(botao.dataset.planTab === sectionId)));
    }

    function set(area = '') {
        atual = AREAS[area] ? area : '';
        try { sessionStorage.setItem('kingMasterEnemArea', atual); } catch { /* Sem armazenamento de sessão disponível. */ }
        if (typeof renderizarCiclo === 'function') renderizarCiclo();
        renderBanner();
        syncNav(document.querySelector('.content-section.active')?.id || '');
    }

    function open(area = '') {
        atual = AREAS[area] ? area : '';
        try { sessionStorage.setItem('kingMasterEnemArea', atual); } catch { /* Sem armazenamento de sessão disponível. */ }
        if (typeof showSection === 'function') showSection('planejamento');
        renderBanner();
        syncNav('planejamento');
    }

    window.KingEnemAreas = Object.freeze({ AREAS, areaOf, matches, set, open, syncNav, renderBanner, current: () => atual });
})();

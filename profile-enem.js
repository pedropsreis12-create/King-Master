/* Perfil do estudante: nível compacto no cartão de identidade, objetivo ENEM e desempenho por área. */
(() => {
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const dados = () => (typeof appData !== 'undefined' ? appData : null);
    const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const dataBr = iso => iso ? iso.split('-').reverse().join('/') : '';
    const horas = minutos => minutos >= 60 ? `${Math.floor(minutos / 60)}h${String(Math.round(minutos % 60)).padStart(2, '0')}` : `${Math.round(minutos)}min`;

    function montarNivel() {
        const card = document.querySelector('#perfil .profile-identity-card');
        if (!card || document.getElementById('profileLevelStrip')) return;
        const faixa = document.createElement('div');
        faixa.className = 'profile-level-strip';
        faixa.id = 'profileLevelStrip';
        const topo = document.createElement('div');
        topo.className = 'profile-level-strip-top';
        ['profileLevelTitle', 'profileNextLevel'].forEach(id => { const el = document.getElementById(id); if (el) topo.append(el); });
        faixa.append(topo);
        ['.profile-xp-line', '.profile-xp-track'].forEach(seletor => { const el = document.querySelector(`#perfil .profile-hero ${seletor}`); if (el) faixa.append(el); });
        const main = card.querySelector('.profile-identity-main');
        (main || card).insertAdjacentElement('afterend', faixa);
    }

    function montarCartoes() {
        const grade = document.querySelector('#perfil .profile-overview-grid');
        if (!grade || document.getElementById('profileEnemGrid')) return;
        const secao = document.createElement('div');
        secao.className = 'profile-enem-grid';
        secao.id = 'profileEnemGrid';
        secao.innerHTML = '<section class="profile-enem-card widget" id="profileGoalCard" aria-label="Meu objetivo no ENEM"></section><section class="profile-enem-card widget" id="profileAreasCard" aria-label="Desempenho por área"></section>';
        grade.insertAdjacentElement('afterend', secao);
    }

    function objetivo(d) {
        const plano = d.studentPlan || {};
        const hoje = hojeIso();
        const proprias = [plano.examDate, plano.examDate2].filter(v => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && v >= hoje).sort();
        const previsto = window.KingMetas?.ENEM_PREVISTO;
        const prova = proprias[0] || previsto?.dia1 || '';
        const dias = prova ? Math.max(0, Math.round((new Date(`${prova}T12:00:00`) - new Date(`${hoje}T12:00:00`)) / 86400000)) : null;
        const curso = String(plano.course || '').trim();
        const nota = String(plano.target || '').trim();
        const linha = (rotulo, valor, vazio) => `<div class="profile-goal-row"><span>${rotulo}</span><strong${valor ? '' : ' class="is-empty"'}>${esc(valor || vazio)}</strong></div>`;
        return `<header><h3>Meu objetivo</h3><button type="button" class="profile-enem-link" onclick="showSection('metas')">Ajustar meta</button></header>
            ${dias === null ? '' : `<div class="profile-goal-count"><strong>${dias}</strong><span>${dias === 1 ? 'dia' : 'dias'} para o ENEM<small>${esc(dataBr(prova))}${proprias[0] ? '' : ' · previsão'}</small></span></div>`}
            ${linha('Curso', curso, 'Não definido')}
            ${linha('Nota que você busca', nota, 'Não definida')}`;
    }

    function areas(d) {
        const Areas = window.KingEnemAreas;
        if (!Areas) return '';
        const soma = {};
        for (const materia of Array.isArray(d.cycleItems) ? d.cycleItems : []) {
            const id = Areas.areaOf(materia);
            if (!Areas.AREAS[id]) continue;
            const s = soma[id] ||= { acertos: 0, erros: 0, minutos: 0 };
            s.acertos += Math.max(0, Number(materia.acertos) || 0);
            s.erros += Math.max(0, Number(materia.erros) || 0);
            s.minutos += Math.max(0, Number(materia.executedMin) || 0);
        }
        const linhas = Object.values(Areas.AREAS).map(area => {
            const s = soma[area.id] || { acertos: 0, erros: 0, minutos: 0 };
            const total = s.acertos + s.erros;
            const taxa = total ? Math.round(s.acertos / total * 100) : null;
            return `<li style="--area-color:${area.cor}"><div class="profile-area-head"><strong>${esc(area.curto)}</strong><span>${taxa === null ? 'sem questões' : `${taxa}% de acerto`}</span></div>
                <div class="profile-area-bar"><span style="width:${taxa || 0}%"></span></div>
                <small>${total} ${total === 1 ? 'questão' : 'questões'} · ${horas(s.minutos)} de estudo</small></li>`;
        }).join('');
        const redacoes = (Array.isArray(d.redacaoItems) ? d.redacaoItems : []).map(r => ['c1', 'c2', 'c3', 'c4', 'c5'].reduce((t, k) => t + (Number(r[k]) || 0), 0)).filter(Boolean);
        const media = redacoes.length ? Math.round(redacoes.reduce((a, b) => a + b, 0) / redacoes.length) : null;
        return `<header><h3>Desempenho por área</h3><button type="button" class="profile-enem-link" onclick="showSection('historico')">Ver detalhes</button></header>
            <ul class="profile-area-list">${linhas}<li style="--area-color:#c2255c"><div class="profile-area-head"><strong>Redação</strong><span>${media === null ? 'sem nota' : `média ${media}`}</span></div>
                <div class="profile-area-bar"><span style="width:${media ? media / 10 : 0}%"></span></div><small>${redacoes.length} ${redacoes.length === 1 ? 'redação corrigida' : 'redações corrigidas'}</small></li></ul>`;
    }

    function render() {
        const d = dados();
        if (!d || !document.getElementById('perfil')) return;
        montarNivel();
        montarCartoes();
        const goal = document.getElementById('profileGoalCard');
        const area = document.getElementById('profileAreasCard');
        if (goal) goal.innerHTML = objetivo(d);
        if (area) area.innerHTML = areas(d);
    }

    window.addEventListener('king-master-section', event => { if (event.detail?.id === 'perfil' || event.detail === 'perfil') render(); });
    window.addEventListener('king-master-data-changed', () => { if (document.getElementById('perfil')?.classList.contains('active')) render(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(render, 0), { once: true }); else setTimeout(render, 0);
    window.KingProfileEnem = { render };
})();

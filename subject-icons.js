/* Ícones vetoriais próprios de cada matéria do ENEM, no mesmo traço dos ícones do menu. */
(() => {
    const ICONES = {
        matematica: '<path d="M7 4v6M4 7h6M14 7h6M15 15l4 4M19 15l-4 4M4 16h6M4 19h6"/>',
        geometria: '<path d="M4 20 12 4l8 16z"/><path d="M8.5 20a3.5 3.5 0 0 0-2.4-4.3"/>',
        estatistica: '<path d="M4 20h16M6.5 20v-6M11 20V8M15.5 20v-9M20 20V5"/>',
        fisica: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>',
        quimica: '<path d="M9 3h6M10 3v6l-5.4 9.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9V3"/><path d="M7.4 15h9.2"/>',
        biologia: '<path d="M8 3c0 4.5 8 5.5 8 9s-8 4.5-8 9M16 3c0 4.5-8 5.5-8 9s8 4.5 8 9"/><path d="M9.2 6.5h5.6M9.2 17.5h5.6M10.8 12h2.4"/>',
        historia: '<path d="M3.5 20.5h17M4.5 9.5h15M12 3.5 4.5 7.5v2h15v-2z"/><path d="M7 9.5V18M10.3 9.5V18M13.7 9.5V18M17 9.5V18M5 18h14"/>',
        geografia: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3"/>',
        filosofia: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
        sociologia: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.6 14.1A4.5 4.5 0 0 1 21 18.5"/>',
        portugues: '<path d="M3 19 8 5l5 14M4.8 14h6.4"/><circle cx="17.5" cy="15.8" r="3"/><path d="M20.5 12.5V19"/>',
        literatura: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5v13"/>',
        idiomas: '<path d="M3.5 4.5h10v7.5h-6l-4 3z"/><path d="M13.5 8.5h7v7.5l-3-2h-5.5V12"/>',
        artes: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.4-1.3-1.7-1.3-3 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
        educacaoFisica: '<path d="M6 7.5v9M3.5 10v4M18 7.5v9M20.5 10v4M6 12h12"/>',
        redacao: '<path d="m4 17-.5 3.5L7 20l11-11-3-3z"/><path d="m13.5 7.5 3 3M4 14V4h8"/>',
        interpretacao: '<path d="M4 5h11M4 9h8M4 13h6"/><circle cx="16" cy="15" r="3.5"/><path d="m18.6 17.6 2.4 2.4"/>',
        atualidades: '<rect x="3.5" y="4.5" width="14" height="15" rx="2"/><path d="M17.5 8.5h3V18a1.5 1.5 0 0 1-3 0M7 8.5h7M7 12h7M7 15.5h4"/>',
        livro: '<path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M8 4.5V17a3 3 0 0 0 3 3M11 9h5M11 12.5h5"/>',
    };

    // A ordem importa: nomes mais específicos vêm antes dos gerais.
    const REGRAS = [
        ['redacao', /redac|dissertat/],
        ['interpretacao', /interpret/],
        ['literatura', /literat/],
        ['portugues', /portugu|gramat|lingua portuguesa|ortograf|sintax/],
        ['idiomas', /ingles|espanhol|lingua estrangeira|idioma|frances/],
        ['artes', /\barte/],
        ['educacaoFisica', /educacao fisica|esporte/],
        ['historia', /histor/],
        ['geografia', /geograf|geopolit|cartograf/],
        ['filosofia', /filosof/],
        ['sociologia', /sociolog/],
        ['atualidades', /atualidad/],
        ['quimica', /quimic/],
        ['fisica', /fisica/],
        ['biologia', /biolog|ecolog|genetic|citolog|botanic|zoolog|fisiolog/],
        ['geometria', /geometr|trigonom/],
        ['estatistica', /estatist|probabil/],
        ['matematica', /matemat|algebra|aritmet|funcao|funcoes|logaritm|porcentag/],
    ];
    const POR_AREA = { linguagens: 'portugues', humanas: 'geografia', natureza: 'biologia', matematica: 'matematica' };
    const norm = value => String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

    function chave(nome, area) {
        const texto = norm(nome);
        const regra = REGRAS.find(([, padrao]) => padrao.test(texto));
        if (regra) return regra[0];
        return POR_AREA[area] || '';
    }

    function svg(id) {
        const caminho = ICONES[id] || ICONES.livro;
        return `<svg class="subject-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${caminho}</svg>`;
    }

    window.KingSubjectIcons = { ICONES, chave, svg, paraMateria: (nome, area) => { const id = chave(nome, area); return id ? svg(id) : ''; } };
})();

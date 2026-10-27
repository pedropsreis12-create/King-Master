(() => {
    const FAMILIES = Object.freeze({
        'Alkali metal': { key: 'alkali', label: 'Metais alcalinos' },
        'Alkaline earth metal': { key: 'alkaline', label: 'Alcalino-terrosos' },
        'Transition metal': { key: 'transition', label: 'Metais de transição' },
        'Post-transition metal': { key: 'post-transition', label: 'Outros metais' },
        Metalloid: { key: 'metalloid', label: 'Semimetais' },
        Nonmetal: { key: 'nonmetal', label: 'Ametais' },
        Halogen: { key: 'halogen', label: 'Halogênios' },
        'Noble gas': { key: 'noble', label: 'Gases nobres' },
        Lanthanide: { key: 'lanthanide', label: 'Lantanídeos' },
        Actinide: { key: 'actinide', label: 'Actinídeos' }
    });

    function position(number) {
        const n = Number(number);
        if (!Number.isInteger(n) || n < 1 || n > 118) return null;
        if (n === 1) return { row: 1, column: 1, period: 1, group: 1 };
        if (n === 2) return { row: 1, column: 18, period: 1, group: 18 };
        if (n <= 4) return { row: 2, column: n - 2, period: 2, group: n - 2 };
        if (n <= 10) return { row: 2, column: n + 8, period: 2, group: n + 8 };
        if (n <= 12) return { row: 3, column: n - 10, period: 3, group: n - 10 };
        if (n <= 18) return { row: 3, column: n, period: 3, group: n };
        if (n <= 36) return { row: 4, column: n - 18, period: 4, group: n - 18 };
        if (n <= 54) return { row: 5, column: n - 36, period: 5, group: n - 36 };
        if (n <= 56) return { row: 6, column: n - 54, period: 6, group: n - 54 };
        if (n <= 71) return { row: 8, column: n - 53, period: 6, group: null };
        if (n <= 86) return { row: 6, column: n - 68, period: 6, group: n - 68 };
        if (n <= 88) return { row: 7, column: n - 86, period: 7, group: n - 86 };
        if (n <= 103) return { row: 9, column: n - 85, period: 7, group: null };
        return { row: 7, column: n - 100, period: 7, group: n - 100 };
    }

    function normalize(value) {
        return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    }

    function matches(element, query = '', category = '') {
        if (category && FAMILIES[element.category]?.key !== category) return false;
        const term = normalize(query);
        if (!term) return true;
        return [element.number, element.symbol, element.name, element.englishName]
            .some(value => normalize(value).includes(term));
    }

    function stateLabel(state) {
        const labels = { Gas: 'Gasoso', Liquid: 'Líquido', Solid: 'Sólido' };
        if (labels[state]) return labels[state];
        const estimated = String(state || '').match(/^Expected to be a (Gas|Liquid|Solid)$/);
        return estimated ? `Estimado: ${labels[estimated[1]].toLowerCase()}` : 'Não informado';
    }

    // Expande o gás nobre abreviado e soma os subníveis pelo número quântico principal.
    // Representa elétrons por camada, não uma previsão da valência química de metais de transição.
    function electronShells(element) {
        const nobleCores = {
            He: [2], Ne: [2, 8], Ar: [2, 8, 8], Kr: [2, 8, 18, 8],
            Xe: [2, 8, 18, 18, 8], Rn: [2, 8, 18, 32, 18, 8]
        };
        const configuration = String(element?.configuration || '');
        const coreName = configuration.match(/\[([A-Za-z]+)\]/)?.[1];
        if (coreName && !nobleCores[coreName]) return null;
        const shells = coreName ? [...nobleCores[coreName]] : [];
        for (const [, level, , electrons] of configuration.matchAll(/([1-7])([spdf])(\d+)/g)) {
            const index = Number(level) - 1;
            shells[index] = (shells[index] || 0) + Number(electrons);
        }
        if (!shells.length || shells.some(count => !Number.isInteger(count) || count < 0)) return null;
        if (shells.reduce((sum, count) => sum + count, 0) !== Number(element?.number)) return null;
        return shells;
    }

    globalThis.KingPeriodicCore = Object.freeze({ FAMILIES, position, normalize, matches, stateLabel, electronShells });
})();

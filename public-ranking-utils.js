export function normalizeSearchName(value) {
    const normalized = String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32);
    return normalized.length >= 2 ? normalized : 'estudante';
}

export function searchTerm(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 32);
}

// Subtrechos curtos permitem buscar também no meio do apelido sem ler a coleção inteira.
export function searchTokens(value) {
    const name = normalizeSearchName(value);
    const tokens = new Set();
    for (let size = 2; size <= Math.min(8, name.length); size += 1) {
        for (let start = 0; start <= name.length - size; start += 1) {
            const token = name.slice(start, start + size).trim();
            if (token.length === size) tokens.add(token);
        }
    }
    return [...tokens].sort();
}

export function searchProbe(value) {
    return searchTerm(value).slice(0, 8);
}

export function matchesSearch(value, query) {
    const term = searchTerm(query);
    return term.length >= 2 && normalizeSearchName(value).includes(term);
}

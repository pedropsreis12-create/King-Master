/* Decisões puras da sincronização, separadas do Firebase para poderem ser testadas. */
(() => {
    const IDENTITY_KEY = 'kingMasterCloudIdentityV2';
    function parseIdentity(storage) {
        try { const value = JSON.parse(storage.getItem(IDENTITY_KEY)); return value && typeof value === 'object' ? value : null; }
        catch { return null; }
    }
    function decideInitial({ remoteExists, remoteRevision = 0, localModifiedAt = 0, identity, uid }) {
        // Dados locais sem proprietário comprovado nunca pertencem automaticamente
        // à primeira conta que entrar neste navegador.
        if (!remoteExists) return identity?.uid === uid ? 'upload' : 'reset';
        if (!identity || identity.uid !== uid) return 'download';
        const localChanged = localModifiedAt > Number(identity.lastLocalRevision || 0);
        if (remoteRevision > Number(identity.cloudRevision || 0)) return localChanged ? 'merge' : 'download';
        if (localChanged) return 'upload';
        return 'ready';
    }
    function identity(uid, cloudRevision, lastLocalRevision, clientId) {
        return { uid, cloudRevision: Number(cloudRevision || 0), lastLocalRevision: Number(lastLocalRevision || 0), clientId };
    }

    // Junção em três vias: "base" é a última versão que este aparelho e a nuvem tinham em comum.
    // Quando os dois lados mudaram, nada registrado em um aparelho é descartado pelo outro.
    const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
    const hasId = item => isObject(item) && (typeof item.id === 'string' || typeof item.id === 'number');
    const listById = list => list.every(hasId);
    const TIMESTAMP = 1e12;

    function mergeById(base, local, remote) {
        const key = item => String(item.id);
        const mapa = list => new Map(list.map(item => [key(item), item]));
        const b = mapa(base), l = mapa(local), r = mapa(remote);
        const ordem = [...new Set([...remote.map(key), ...local.map(key)])];
        const saida = [];
        for (const id of ordem) {
            const valor = merge3(b.get(id), l.get(id), r.get(id));
            if (valor !== undefined) saida.push(valor);
        }
        return saida;
    }

    function mergeList(base, local, remote) {
        const texto = value => JSON.stringify(value);
        const b = new Set(base.map(texto)), l = new Set(local.map(texto)), r = new Set(remote.map(texto));
        const vistos = new Set();
        const saida = [];
        for (const item of [...remote, ...local]) {
            const chave = texto(item);
            if (vistos.has(chave)) continue;
            vistos.add(chave);
            if (b.has(chave) && (!l.has(chave) || !r.has(chave))) continue; // apagado em um dos lados
            saida.push(item);
        }
        return saida;
    }

    function merge3(base, local, remote) {
        if (same(local, remote)) return local;
        if (base !== undefined) {
            if (same(local, base)) return remote;
            if (same(remote, base)) return local;
        }
        // Os dois lados mudaram. Um lado que apagou enquanto o outro editou: a edição fica.
        if (local === undefined) return remote;
        if (remote === undefined) return local;
        if (typeof local === 'number' && typeof remote === 'number') {
            if (typeof base !== 'number' || base > TIMESTAMP || local > TIMESTAMP || remote > TIMESTAMP) return Math.max(local, remote);
            return remote + (local - base); // contadores: soma o que cada aparelho acrescentou
        }
        if (Array.isArray(local) && Array.isArray(remote)) {
            const b = Array.isArray(base) ? base : [];
            if (local.length + remote.length > 0 && listById(local) && listById(remote) && listById(b)) return mergeById(b, local, remote);
            const numeros = [...b, ...local, ...remote].every(value => typeof value === 'number');
            if (numeros && local.length === remote.length && b.length === local.length) return local.map((value, i) => merge3(b[i], value, remote[i]));
            return mergeList(b, local, remote);
        }
        if (isObject(local) && isObject(remote)) {
            const b = isObject(base) ? base : undefined;
            const saida = {};
            for (const chave of new Set([...Object.keys(remote), ...Object.keys(local)])) {
                const valor = merge3(b ? b[chave] : undefined, local[chave], remote[chave]);
                if (valor !== undefined) saida[chave] = valor;
            }
            return saida;
        }
        return local;
    }

    function mergeData(base, local, remote, now = Date.now()) {
        const merged = merge3(isObject(base) ? base : undefined, local, remote);
        const semana = data => Date.parse(data?.lastWeekStart) || 0;
        if (!(semana(local) === semana(remote) && semana(base) === semana(local))) {
            if (semana(local) === semana(remote)) {
                merged.weeklyChart = (local.weeklyChart || []).map((valor, i) => Math.max(Number(valor) || 0, Number(remote.weeklyChart?.[i]) || 0));
            } else {
                const maisNova = semana(local) > semana(remote) ? local : remote;
                merged.weeklyChart = [...(maisNova.weeklyChart || [0, 0, 0, 0, 0, 0, 0])];
                merged.lastWeekStart = maisNova.lastWeekStart;
            }
        }
        // O cronômetro não se soma: vale o que está rodando, e senão o deste aparelho.
        const timer = local?.timerState?.running ? local.timerState : remote?.timerState?.running ? remote.timerState : (local?.timerState ?? remote?.timerState);
        if (timer !== undefined) merged.timerState = timer;
        merged.lastModifiedAt = Math.max(Number(local?.lastModifiedAt) || 0, Number(remote?.lastModifiedAt) || 0, now);
        return merged;
    }

    window.KingCloudState = { IDENTITY_KEY, parseIdentity, decideInitial, identity, merge3, mergeData };
})();

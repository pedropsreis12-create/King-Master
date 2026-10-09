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
        if (remoteRevision > Number(identity.cloudRevision || 0)) return 'download';
        if (localModifiedAt > Number(identity.lastLocalRevision || 0)) return 'upload';
        return 'ready';
    }
    function identity(uid, cloudRevision, lastLocalRevision, clientId) {
        return { uid, cloudRevision: Number(cloudRevision || 0), lastLocalRevision: Number(lastLocalRevision || 0), clientId };
    }
    window.KingCloudState = { IDENTITY_KEY, parseIdentity, decideInitial, identity };
})();

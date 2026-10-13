import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8');
const warmupSource = await readFile(new URL('../auth-warmup.js', import.meta.url), 'utf8');

test('o acesso Google começa a restaurar a sessão antes de carregar o painel', async () => {
    let appStarts = 0;
    let authStarts = 0;
    const app = {};
    const sdk = {
        'firebase-app': { getApps: () => [], initializeApp: () => { appStarts++; return app; } },
        'firebase-auth': { getAuth: received => { assert.equal(received, app); authStarts++; return {}; } }
    };
    const window = { KING_MASTER_FIREBASE_CONFIG: { apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', appId: 'fixture' } };
    const context = vm.createContext({ window, Promise, __sdk: sdk });
    const fixture = warmupSource.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[\w-]+)\.js'\)/g, 'Promise.resolve(__sdk["$1"])');
    vm.runInContext(fixture, context);
    const ready = await window.kingMasterAuthWarmup;
    assert.equal(ready.app, app);
    assert.equal(ready.auth.languageCode, 'pt-BR');
    assert.equal(appStarts, 1);
    assert.equal(authStarts, 1);
});

test('o aquecimento reutiliza o aplicativo Firebase existente sem criar outra conta', async () => {
    const app = {};
    const sdk = {
        'firebase-app': { getApps: () => [app], getApp: () => app, initializeApp: () => { throw new Error('Não criar outro aplicativo'); } },
        'firebase-auth': { getAuth: received => { assert.equal(received, app); return {}; } }
    };
    const window = { KING_MASTER_FIREBASE_CONFIG: { apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', appId: 'fixture' } };
    const context = vm.createContext({ window, Promise, __sdk: sdk });
    const fixture = warmupSource.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[\w-]+)\.js'\)/g, 'Promise.resolve(__sdk["$1"])');
    vm.runInContext(fixture, context);
    assert.equal((await window.kingMasterAuthWarmup).app, app);
});

async function harness(savedUid) {
    const state = { authListener: null, unlocked: false, remoteReads: 0 };
    const sdk = {
        'firebase-app': { initializeApp: () => ({}) },
        'firebase-auth': { getAuth: () => ({}), GoogleAuthProvider: class { setCustomParameters() {} },
            setPersistence: async () => {}, getRedirectResult: async () => {},
            onAuthStateChanged(_auth, listener) { state.authListener = listener; } },
        'firebase-firestore': { getFirestore: () => ({}), setLogLevel() {}, doc: () => ({}),
            getDoc: () => { state.remoteReads++; return new Promise(() => {}); } },
        'firebase-app-check': { initializeAppCheck: () => ({}), ReCaptchaEnterpriseProvider: class {}, getToken: async () => ({ token: 'ok' }) }
    };
    const storage = new Map([['kingMasterCloudIdentityV2', JSON.stringify({ uid: savedUid, cloudRevision: 1, lastLocalRevision: 1 })]]);
    const localStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
    const window = {
        KING_MASTER_FIREBASE_CONFIG: { apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', appId: 'fixture' },
        location: { hostname: 'example.com', search: '' },
        KingCloudState: { IDENTITY_KEY: 'kingMasterCloudIdentityV2', parseIdentity: store => JSON.parse(store.getItem('kingMasterCloudIdentityV2')) },
        kingMasterCloudBridge: { exportData: () => ({ accountUid: savedUid, lastModifiedAt: 1 }) },
        addEventListener() {}, dispatchEvent() {}
    };
    const document = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
        documentElement: { classList: { add() { state.unlocked = false; }, remove() { state.unlocked = true; }, contains: () => !state.unlocked } } };
    const context = vm.createContext({ window, self: window, document, localStorage, console, crypto: { randomUUID: () => 'client' },
        URLSearchParams, CustomEvent: class {}, setTimeout, clearTimeout, Date, Promise, DOMException, AbortController,
        __sdk: sdk, aiPending: new Promise(() => {}) });
    const testSource = source.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-ai\.js'\)/g, 'aiPending')
        .replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[\w-]+)\.js'\)/g, 'Promise.resolve(__sdk["$1"])');
    await vm.runInContext(`(async () => { ${testSource}\n})()`, context);
    return { state };
}

test('uma conta reconhecida espera a revisão da nuvem antes de mostrar os dados locais', async () => {
    const { state } = await harness('estudante-1');
    assert.equal(typeof state.authListener, 'function');
    void state.authListener({ uid: 'estudante-1', email: 'estudante@example.com' });
    assert.equal(state.unlocked, false);
    assert.equal(state.remoteReads, 1);
});

test('uma conta diferente não abre os dados do aparelho antes da verificação na nuvem', async () => {
    const { state } = await harness('outra-conta');
    void state.authListener({ uid: 'estudante-1', email: 'estudante@example.com' });
    assert.equal(state.unlocked, false);
    assert.equal(state.remoteReads, 1);
});

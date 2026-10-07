import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8');

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
        kingMasterCloudBridge: { exportData: () => ({ lastModifiedAt: 1 }) },
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

test('uma conta reconhecida abre seus dados locais antes de carregar a IA e a nuvem', async () => {
    const { state } = await harness('estudante-1');
    assert.equal(typeof state.authListener, 'function');
    void state.authListener({ uid: 'estudante-1', email: 'estudante@example.com' });
    assert.equal(state.unlocked, true);
    assert.equal(state.remoteReads, 1);
});

test('uma conta diferente não abre os dados do aparelho antes da verificação na nuvem', async () => {
    const { state } = await harness('outra-conta');
    void state.authListener({ uid: 'estudante-1', email: 'estudante@example.com' });
    assert.equal(state.unlocked, false);
    assert.equal(state.remoteReads, 1);
});

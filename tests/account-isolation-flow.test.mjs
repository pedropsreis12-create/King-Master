import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const syncSource = await readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8');
const stateSource = await readFile(new URL('../cloud-state.js', import.meta.url), 'utf8');

async function start({ savedUid = '', remote = null, localAccountUid = '' } = {}) {
    const result = { resets: [], imports: [], writes: [], unlocked: false };
    const user = { uid: 'new-user', email: 'new@example.com', displayName: 'Nova pessoa' };
    const auth = { currentUser: null };
    const sdk = {
        'firebase-app': { initializeApp: () => ({}) },
        'firebase-auth': {
            getAuth: () => auth,
            GoogleAuthProvider: class { setCustomParameters() {} },
            setPersistence: async () => {}, getRedirectResult: async () => {},
            onAuthStateChanged(_auth, listener) { result.authChanged = listener; }
        },
        'firebase-firestore': {
            getFirestore: () => ({}), setLogLevel() {}, doc: (_db, ...parts) => parts.join('/'),
            getDoc: async () => ({ exists: () => Boolean(remote), data: () => remote }),
            runTransaction: async (_db, action) => action({
                get: async () => ({ exists: () => Boolean(remote), data: () => remote }),
                set: (_reference, data) => result.writes.push(data)
            }),
            onSnapshot: () => () => {}, serverTimestamp: () => 'timestamp'
        },
        'firebase-app-check': {
            initializeAppCheck: () => ({}), ReCaptchaEnterpriseProvider: class {},
            getToken: async () => ({ token: 'ok' })
        }
    };
    const values = new Map();
    if (savedUid) values.set('kingMasterCloudIdentityV2', JSON.stringify({ uid: savedUid, cloudRevision: 1, lastLocalRevision: 1 }));
    const storage = {
        getItem: key => values.get(key) || null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key)
    };
    const window = {
        KING_MASTER_FIREBASE_CONFIG: { apiKey: 'fixture', authDomain: 'fixture', projectId: 'fixture', appId: 'fixture' },
        location: { hostname: 'example.com', search: '', reload() {} },
        kingMasterCloudBridge: {
            exportData: () => ({ accountUid: localAccountUid, profileName: 'Outra pessoa', lastModifiedAt: 100 }),
            resetForAccount: (...args) => result.resets.push(args),
            importData: (...args) => result.imports.push(args)
        },
        addEventListener() {}, dispatchEvent() {}
    };
    const document = {
        getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
        documentElement: { classList: { add() { result.unlocked = false; }, remove() { result.unlocked = true; }, contains: () => !result.unlocked } }
    };
    const context = vm.createContext({ window, self: window, document, localStorage: storage, sessionStorage: storage,
        console, crypto: { randomUUID: () => 'client' }, URLSearchParams, CustomEvent: class {},
        setTimeout, clearTimeout, Date, Promise, DOMException, AbortController,
        __sdk: sdk, aiPending: new Promise(() => {}) });
    vm.runInContext(stateSource, context);
    const fixture = syncSource.replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-ai\.js'\)/g, 'aiPending')
        .replace(/import\('https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/(firebase-[\w-]+)\.js'\)/g, 'Promise.resolve(__sdk["$1"])');
    await vm.runInContext(`(async () => { ${fixture}\n})()`, context);
    result.enter = async () => { auth.currentUser = user; await result.authChanged(user); };
    return result;
}

test('a first Google account starts fresh instead of uploading anonymous or previous-person data', async () => {
    const result = await start();
    await result.enter();
    assert.equal(result.resets.length, 1);
    assert.equal(result.resets[0][1], 'new-user');
    assert.equal(result.writes.length, 0);
    assert.equal(result.unlocked, false);
});

test('a different Google account downloads only its own existing cloud document', async () => {
    const result = await start({ savedUid: 'old-user', localAccountUid: 'old-user', remote: {
        ownerUid: 'new-user', cloudRevision: 2, data: { accountUid: 'new-user', profileName: 'Nova pessoa', lastModifiedAt: 20 }
    } });
    await result.enter();
    assert.equal(result.imports.length, 1);
    assert.equal(result.imports[0][1], 'new-user');
    assert.equal(result.writes.length, 0);
});

test('only an already recognized owner can upload local data', async () => {
    const result = await start({ savedUid: 'new-user', localAccountUid: 'new-user' });
    await result.enter();
    assert.equal(result.writes.length, 1);
    assert.equal(result.writes[0].ownerUid, 'new-user');
    assert.equal(result.writes[0].data.accountUid, 'new-user');
    assert.equal(result.resets.length, 0);
});

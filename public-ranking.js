// Placar opt-in. Cada pessoa publica somente um apelido e sua pontuação sazonal.
// Sem backend confiável gratuito, a pontuação é autodeclarada e exibida como não verificada.
import { normalizeSearchName, searchTerm, searchTokens, searchProbe, matchesSearch } from './public-ranking-utils.js';
const [{ initializeApp }, authSdk, firestoreSdk] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
]);

const app = initializeApp(window.KING_MASTER_FIREBASE_CONFIG);
const auth = authSdk.getAuth(app);
const db = firestoreSdk.getFirestore(app);
let joined = false;
let knownUid = '';
let lastPublished = null;
let lastPublishAt = 0;

function currentIdentity() {
    const user = auth.currentUser;
    if (!user?.uid) throw new Error('Entre na sua conta para acessar o placar.');
    return user;
}

function snapshotForPublication() {
    const rank = window.KingRankV2?.snapshot(appData, { readOnly: true });
    if (!rank?.season?.id || !/^20\d\d-(0[1-9]|1[0-2])$/.test(rank.season.id)) throw new Error('A temporada ainda não está disponível.');
    const profileName = String(appData?.profileName || '').trim().replace(/\s+/g, ' ').slice(0, 32);
    return {
        displayName: profileName.length >= 2 ? profileName : 'Estudante',
        searchName: normalizeSearchName(profileName),
        searchTokens: searchTokens(profileName),
        seasonId: rank.season.id,
        score: Math.max(0, Math.min(1000000, Math.round(Number(rank.season.score) || 0))),
        level: Math.max(1, Math.min(100, Math.round(Number(rank.lifetime.level) || 1)))
    };
}

function ownDocument(user = currentIdentity()) {
    return firestoreSdk.doc(db, 'publicRanking', user.uid);
}

function seasonQuery(seasonId) {
    return firestoreSdk.query(
        firestoreSdk.collection(db, 'publicRanking'),
        firestoreSdk.where('seasonId', '==', seasonId),
        firestoreSdk.orderBy('score', 'desc'),
        firestoreSdk.limit(30)
    );
}

function peopleQuery(seasonId, name) {
    return firestoreSdk.query(
        firestoreSdk.collection(db, 'publicRanking'),
        firestoreSdk.where('seasonId', '==', seasonId),
        firestoreSdk.orderBy('searchName'),
        firestoreSdk.startAt(name),
        firestoreSdk.endAt(`${name}\uf8ff`),
        firestoreSdk.limit(30)
    );
}

function matchingPeopleQuery(seasonId, term) {
    return firestoreSdk.query(
        firestoreSdk.collection(db, 'publicRanking'),
        firestoreSdk.where('seasonId', '==', seasonId),
        firestoreSdk.where('searchTokens', 'array-contains', searchProbe(term)),
        firestoreSdk.limit(30)
    );
}

function mapEntries(results) {
    return results.docs.map(item => {
        const data = item.data();
        return {
            uid: item.id,
            displayName: String(data.displayName || 'Estudante').slice(0, 32),
            score: Math.max(0, Number(data.score) || 0),
            level: Math.max(1, Number(data.level) || 1),
            searchName: String(data.searchName || '')
        };
    });
}

async function list() {
    const user = currentIdentity();
    const current = snapshotForPublication();
    const [own, results] = await Promise.all([
        firestoreSdk.getDoc(ownDocument(user)),
        firestoreSdk.getDocs(seasonQuery(current.seasonId))
    ]);
    joined = own.exists();
    knownUid = user.uid;
    return {
        seasonId: current.seasonId,
        joined,
        ownScore: own.exists() ? own.data().score : null,
        uid: user.uid,
        entries: mapEntries(results)
    };
}

function watch(name, onUpdate, onError) {
    const user = currentIdentity();
    const current = snapshotForPublication();
    const term = searchTerm(name);
    if (term && term.length < 2) throw new Error('Digite pelo menos duas letras para buscar.');
    let active = true;
    let ownReady = false;
    let resultsReady = false;
    let own = null;
    let results = null;
    let legacyResults = null;
    let legacyReady = !term;
    const emit = () => {
        if (!active || !ownReady || !resultsReady || !legacyReady) return;
        const entries = term
            ? [...new Map([...(results?.docs || []), ...(legacyResults?.docs || [])]
                .map(item => [item.id, item])).values()]
                .map(item => mapEntries({ docs: [item] })[0])
                .filter(entry => matchesSearch(entry.searchName || entry.displayName, term))
                .sort((a, b) => {
                    const aStarts = a.searchName.startsWith(term) ? 0 : 1;
                    const bStarts = b.searchName.startsWith(term) ? 0 : 1;
                    return aStarts - bStarts || a.searchName.localeCompare(b.searchName, 'pt-BR');
                })
            : mapEntries(results);
        onUpdate({
            seasonId: current.seasonId,
            joined: Boolean(own?.exists()),
            ownScore: own?.exists() ? own.data().score : null,
            uid: user.uid,
            searching: Boolean(term),
            entries
        });
    };
    const fail = error => { if (active) onError(error); };
    const stopOwn = firestoreSdk.onSnapshot(ownDocument(user), snapshot => {
        own = snapshot;
        ownReady = true;
        joined = snapshot.exists();
        knownUid = user.uid;
        if (joined && !Array.isArray(snapshot.data()?.searchTokens)) syncIfJoined().catch(() => {});
        emit();
    }, fail);
    const stopResults = firestoreSdk.onSnapshot(term ? matchingPeopleQuery(current.seasonId, term) : seasonQuery(current.seasonId), snapshot => {
        results = snapshot;
        resultsReady = true;
        emit();
    }, error => {
        if (term && /failed-precondition/i.test(String(error?.code || ''))) {
            results = { docs: [] };
            resultsReady = true;
            emit();
        } else fail(error);
    });
    const stopLegacy = term ? firestoreSdk.onSnapshot(peopleQuery(current.seasonId, term), snapshot => {
        legacyResults = snapshot;
        legacyReady = true;
        emit();
    }, fail) : () => {};
    return () => {
        active = false;
        stopOwn();
        stopResults();
        stopLegacy();
    };
}

function inviteDocument(fromUid, toUid) {
    return firestoreSdk.doc(db, 'friendInvites', `${fromUid}_${toUid}`);
}

function mapInvites(snapshot) {
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

function watchInvites(onUpdate, onError) {
    const user = currentIdentity();
    let incoming = null;
    let outgoing = null;
    let active = true;
    const emit = () => {
        if (active && incoming && outgoing) onUpdate([...mapInvites(incoming), ...mapInvites(outgoing)]);
    };
    const invites = firestoreSdk.collection(db, 'friendInvites');
    const stopIncoming = firestoreSdk.onSnapshot(firestoreSdk.query(invites, firestoreSdk.where('toUid', '==', user.uid), firestoreSdk.limit(50)), snapshot => {
        incoming = snapshot;
        emit();
    }, onError);
    const stopOutgoing = firestoreSdk.onSnapshot(firestoreSdk.query(invites, firestoreSdk.where('fromUid', '==', user.uid), firestoreSdk.limit(50)), snapshot => {
        outgoing = snapshot;
        emit();
    }, onError);
    return () => {
        active = false;
        stopIncoming();
        stopOutgoing();
    };
}

async function profile(uid) {
    currentIdentity();
    const snapshot = await firestoreSdk.getDoc(firestoreSdk.doc(db, 'publicRanking', String(uid || '')));
    return snapshot.exists() ? mapEntries({ docs: [snapshot] })[0] : null;
}

async function sendInvite(targetUid) {
    const user = currentIdentity();
    if (!targetUid || targetUid === user.uid) throw new Error('Escolha outro participante.');
    const [own, target] = await Promise.all([
        firestoreSdk.getDoc(ownDocument(user)),
        firestoreSdk.getDoc(firestoreSdk.doc(db, 'publicRanking', targetUid))
    ]);
    if (!own.exists()) throw new Error('Participe do placar público antes de enviar convites.');
    if (!target.exists()) throw new Error('Este participante não está mais no placar público.');
    await firestoreSdk.setDoc(inviteDocument(user.uid, targetUid), {
        fromUid: user.uid, toUid: targetUid,
        fromName: own.data().displayName, toName: target.data().displayName,
        status: 'pending', createdAt: firestoreSdk.serverTimestamp(), updatedAt: firestoreSdk.serverTimestamp()
    });
}

async function answerInvite(invite, status) {
    const user = currentIdentity();
    if (invite?.toUid !== user.uid || !['accepted', 'declined'].includes(status)) throw new Error('Convite inválido.');
    await firestoreSdk.updateDoc(inviteDocument(invite.fromUid, invite.toUid), {
        status, updatedAt: firestoreSdk.serverTimestamp()
    });
}

async function removeInvite(invite) {
    const user = currentIdentity();
    if (![invite?.fromUid, invite?.toUid].includes(user.uid)) throw new Error('Convite inválido.');
    await firestoreSdk.deleteDoc(inviteDocument(invite.fromUid, invite.toUid));
}

async function join() {
    const user = currentIdentity();
    const current = snapshotForPublication();
    await firestoreSdk.setDoc(ownDocument(user), {
        uid: user.uid,
        ...current,
        updatedAt: firestoreSdk.serverTimestamp()
    });
    joined = true;
    knownUid = user.uid;
    lastPublished = current;
    lastPublishAt = Date.now();
    return list();
}

async function leave() {
    const user = currentIdentity();
    await firestoreSdk.deleteDoc(ownDocument(user));
    joined = false;
    lastPublished = null;
    lastPublishAt = 0;
    return list();
}

async function syncIfJoined() {
    const user = auth.currentUser;
    if (!joined || !user || user.uid !== knownUid || Date.now() - lastPublishAt < 5 * 60_000) return false;
    const current = snapshotForPublication();
    if (JSON.stringify(current) === JSON.stringify(lastPublished)) return false;
    await firestoreSdk.setDoc(ownDocument(user), { uid: user.uid, ...current, updatedAt: firestoreSdk.serverTimestamp() });
    lastPublished = current;
    lastPublishAt = Date.now();
    return true;
}

authSdk.onAuthStateChanged(auth, user => {
    if (user?.uid === knownUid) return;
    joined = false;
    knownUid = user?.uid || '';
    lastPublished = null;
    lastPublishAt = 0;
    window.dispatchEvent(new Event('king-public-ranking-auth-changed'));
});

window.KingPublicRanking = { list, watch, join, leave, syncIfJoined, watchInvites, profile, sendInvite, answerInvite, removeInvite, currentUserId: () => auth.currentUser?.uid || null };
window.dispatchEvent(new Event('king-public-ranking-ready'));

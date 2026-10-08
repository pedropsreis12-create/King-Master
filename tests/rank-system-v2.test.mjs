import test from 'node:test';
import assert from 'node:assert/strict';

await import('../rank-system-v2.js');
const Rank = globalThis.KingRankV2;

const monday = Date.parse('2026-09-28T15:00:00Z');
const tuesday = Date.parse('2026-09-29T15:00:00Z');
const options = { now: tuesday, utcOffsetMinutes: -180, dateKey: '2026-09-29' };

function emptyData() {
    return {
        profileName: 'Estudante', rankVisualMode: 'militar', historyItems: [], simuladosItems: [],
        redacaoItems: [], revisoesItems: [], cadernoErrosItems: [], cycleItems: [],
        flashcards: { reviews: [] }, xpLoginDates: [], xpResetOffset: 0
    };
}

test('expõe uma API autônoma e determinística', () => {
    assert.equal(Rank.VERSION, 2);
    assert.equal(typeof Rank.migrate, 'function');
    assert.equal(typeof Rank.snapshot, 'function');
    assert.equal(Rank.seasonFor(tuesday, { utcOffsetMinutes: -180 }).id, '2026-09');
    assert.deepEqual(Rank.getMissions(emptyData(), options), Rank.getMissions(emptyData(), options));
});

test('migra evidência legada sem alterar o objeto original nem inventar eventos', () => {
    const original = {
        ...emptyData(),
        historyItems: [{ id: monday, dataISO: '2026-09-28', tempoSegundos: 3600, questoes: 10, acertos: 8 }],
        simuladosItems: [{ id: 2, date: '2026-09-28', acertos: 2 }],
        redacaoItems: [{ id: 3, date: '2026-09-28' }],
        xpLoginDates: ['2026-09-28']
    };
    const before = structuredClone(original);
    const result = Rank.migrate(original, options);
    assert.deepEqual(original, before);
    assert.equal(result.report.created, true);
    // 60 min × 7 + 2 acertos × 30 + redação 1000 + login 150 = 1630.
    assert.equal(result.state.lifetimeXp, 1630);
    assert.equal(result.state.season.current.xp, 1630);
    assert.equal(result.state.history.length, 1);
    assert.equal(result.state.history[0].type, 'legacy_migration');
});

test('migração é idempotente e não recalcula o piso legado', () => {
    const first = Rank.migrate({ ...emptyData(), historyItems: [{ id: monday, dataISO: '2026-09-28', tempoSegundos: 3600 }] }, options);
    const second = Rank.migrate(first.appData, options);
    assert.equal(second.state.lifetimeXp, first.state.lifetimeXp);
    assert.equal(second.state.history.length, first.state.history.length);
    assert.equal(second.report.created, false);
});

test('eventos exigem id, são deduplicados e obedecem limite por evento e por dia', () => {
    const data = Rank.migrate(emptyData(), options).appData;
    const missingId = Rank.record(data, { type: 'study_minutes', quantity: 10, occurredAt: tuesday }, options);
    assert.equal(missingId.receipt.ok, false);

    const first = Rank.record(data, { id: 'history:one:minutes', type: 'study_minutes', quantity: 900, occurredAt: tuesday, dateKey: '2026-09-29' }, options);
    assert.equal(first.receipt.status, 'partial');
    assert.equal(first.receipt.acceptedUnits, 240);
    assert.equal(first.receipt.xp, 1680);

    const duplicate = Rank.record(first.appData, { id: 'history:one:minutes', type: 'study_minutes', quantity: 50, occurredAt: tuesday }, options);
    assert.equal(duplicate.receipt.status, 'duplicate');
    assert.equal(duplicate.state.lifetimeXp, first.state.lifetimeXp);

    const second = Rank.record(first.appData, { id: 'history:two:minutes', type: 'study_minutes', quantity: 240, occurredAt: tuesday }, options);
    const third = Rank.record(second.appData, { id: 'history:three:minutes', type: 'study_minutes', quantity: 240, occurredAt: tuesday }, options);
    assert.equal(second.receipt.acceptedUnits, 240);
    assert.equal(third.receipt.acceptedUnits, 120);
    assert.equal(third.receipt.status, 'partial');
    assert.equal(third.state.dailyBuckets['2026-09-29'].units.study_minutes, 600);
});

test('não aceita XP negativo, evento futuro ou evento muito antigo', () => {
    const data = Rank.migrate(emptyData(), options).appData;
    assert.equal(Rank.record(data, { id: 'bad:negative', type: 'study_minutes', quantity: -5, occurredAt: tuesday }, options).receipt.ok, false);
    assert.equal(Rank.record(data, { id: 'bad:future', type: 'study_minutes', quantity: 5, occurredAt: tuesday + 3600000 }, options).receipt.ok, false);
    assert.equal(Rank.record(data, { id: 'bad:old', type: 'study_minutes', quantity: 5, occurredAt: tuesday - 40 * 86400000 }, options).receipt.ok, false);
});

test('maior nível nunca regride mesmo diante de estado antigo inconsistente', () => {
    const migrated = Rank.migrate(emptyData(), options);
    const tampered = { ...migrated.appData, rankV2: { ...migrated.state, lifetimeXp: 0, highestLevel: 25 } };
    const result = Rank.record(tampered, { id: 'login:2026-09-29', type: 'daily_login', quantity: 1, occurredAt: tuesday }, options);
    assert.equal(result.state.highestLevel, 25);
    assert.equal(Rank.snapshot(result.appData, options).lifetime.level, 25);
    assert.equal(result.state.lifetimeXp, 100);
});

test('virada de temporada arquiva a liga e preserva XP vitalício', () => {
    const september = Rank.record(emptyData(), { id: 'essay:sep', type: 'essay_completed', quantity: 1, occurredAt: tuesday }, options);
    const lifetime = september.state.lifetimeXp;
    const octoberOptions = { now: Date.parse('2026-10-02T15:00:00Z'), utcOffsetMinutes: -180, dateKey: '2026-10-02' };
    const october = Rank.migrate(september.appData, octoberOptions);
    assert.equal(october.state.lifetimeXp, lifetime);
    assert.equal(october.state.season.current.id, '2026-10');
    assert.equal(october.state.season.current.xp, 0);
    assert.equal(october.state.season.archive.at(-1).id, '2026-09');
});

test('missões usam ações aceitas e recompensa só pode ser resgatada uma vez', () => {
    let data = Rank.migrate(emptyData(), options).appData;
    data = Rank.record(data, { id: 'focus:mission', type: 'study_minutes', quantity: 60, occurredAt: tuesday }, options).appData;
    const view = Rank.getMissions(data, options);
    const focus = view.daily.find(item => item.actionType === 'study_minutes');
    assert.ok(focus.completed);
    const claimed = Rank.claimMission(data, focus.id, options);
    assert.equal(claimed.receipt.ok, true);
    assert.equal(claimed.receipt.xp, focus.rewardXp);
    const duplicate = Rank.claimMission(claimed.appData, focus.id, options);
    assert.equal(duplicate.receipt.status, 'duplicate');
    assert.equal(duplicate.state.lifetimeXp, claimed.state.lifetimeXp);

    const incomplete = Rank.getMissions(claimed.appData, options).all.find(item => !item.completed);
    assert.equal(Rank.claimMission(claimed.appData, incomplete.id, options).receipt.status, 'incomplete');
});

test('conquistas são derivadas de evidência explícita e sincronizadas sem dar XP', () => {
    const data = {
        ...emptyData(),
        historyItems: [{ id: monday, dataISO: '2026-09-28', tempoSegundos: 11 * 60, questoes: 100, acertos: 82 }]
    };
    const migrated = Rank.migrate(data, options);
    const xpBefore = migrated.state.lifetimeXp;
    const synced = Rank.syncAchievements(migrated.appData, options);
    const ids = synced.newUnlocks.map(item => item.id);
    assert.ok(ids.includes('questions-50'));
    assert.ok(!ids.includes('focus-5h'));
    assert.ok(!ids.includes('accuracy-80-300'));
    assert.equal(synced.state.lifetimeXp, xpBefore);
    const again = Rank.syncAchievements(synced.appData, options);
    assert.equal(again.newUnlocks.length, 0);
});

test('coleção tem 50 conquistas, dez por faixa, sem metas triviais', () => {
    assert.equal(Rank.ACHIEVEMENTS.length, 50);
    const tiers = ['facil', 'normal', 'media', 'dificil', 'muito_dificil'];
    tiers.forEach(tier => assert.equal(Rank.ACHIEVEMENTS.filter(item => item.tier === tier).length, 10));
    assert.equal(new Set(Rank.ACHIEVEMENTS.map(item => item.id)).size, 50);
    assert.ok(!Rank.ACHIEVEMENTS.some(item => item.id === 'first-focus'));
    assert.ok(Rank.ACHIEVEMENTS.every(item => item.icon && item.goal > 0));
});

test('snapshot é próprio para UI e deixa explícito que não há placar global inventado', () => {
    const data = Rank.migrate(emptyData(), options).appData;
    const snap = Rank.snapshot(data, options);
    assert.equal(snap.ranking.mode, 'local');
    assert.equal(snap.ranking.verified, false);
    assert.equal(snap.ranking.leaderboard, null);
    assert.equal(snap.integrity.antiAbuse.eventDeduplication, true);
    assert.ok(snap.lifetime.progressPercent >= 0 && snap.lifetime.progressPercent <= 100);
    assert.ok(snap.season.league.label.startsWith('Liga '));
});

test('validação repara campos corrompidos sem reduzir o maior nível legítimo', () => {
    const checked = Rank.validate({ version: 2, lifetimeXp: -99, highestLevel: 12, history: new Array(400).fill({ id: 'x' }), processedEvents: [] }, options);
    assert.equal(checked.valid, true);
    assert.ok(checked.warnings.length >= 2);
    assert.equal(checked.state.lifetimeXp, 0);
    assert.equal(checked.state.highestLevel, 12);
    assert.equal(checked.state.history.length, 360);
});

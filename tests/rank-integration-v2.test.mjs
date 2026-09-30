import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const engineSource = await readFile(new URL('../rank-system-v2.js', import.meta.url), 'utf8');
const integrationSource = await readFile(new URL('../rank-integration-v2.js', import.meta.url), 'utf8');

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function createBrowserHarness() {
    const listeners = new Map();
    const context = vm.createContext({
        console: { warn() {}, error() {}, log() {} },
        setTimeout,
        clearTimeout,
        Date,
        Math,
        JSON,
        Object,
        Array,
        Map,
        Set,
        Uint8Array,
        Number,
        String,
        Boolean,
        RegExp,
        Intl,
        CustomEvent: class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        }
    });

    context.window = context;
    context.addEventListener = (name, listener) => {
        const bucket = listeners.get(name) || [];
        bucket.push(listener);
        listeners.set(name, bucket);
    };
    context.dispatchEvent = event => {
        (listeners.get(event.type) || []).forEach(listener => listener(event));
        return true;
    };
    context.appData = {
        profileName: 'Teste',
        historyItems: [{ id: Date.now() - 5_000, dataISO: new Date().toISOString().slice(0, 10), materia: 'Física', tempoSegundos: 600 }],
        cycleItems: [],
        revisoesItems: [],
        simuladosItems: [],
        redacaoItems: [],
        xpLoginDates: []
    };
    context.saveCount = 0;
    context.saveAppData = () => {
        context.saveCount += 1;
        context.dispatchEvent(new context.CustomEvent('king-master-data-changed', { detail: { updatedAt: Date.now() } }));
    };

    vm.runInContext(engineSource, context, { filename: 'rank-system-v2.js' });
    vm.runInContext(integrationSource, context, { filename: 'rank-integration-v2.js' });
    return context;
}

test('integração cria baseline sem duplicar XP e registra somente evidência nova', async () => {
    const context = createBrowserHarness();
    await wait(140);

    assert.equal(context.appData.rankV2.lifetimeXp, 70);
    assert.equal(Object.keys(context.appData.rankV2.processedEvents).length, 0);
    assert.equal(context.appData.rankV2Integration.baselineComplete, true);
    assert.ok(context.appData.rankV2Integration.seenEvidence.length >= 2);

    const today = new Date();
    context.appData.xpLoginDates.push(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    context.saveAppData();
    await wait(180);
    assert.equal(context.appData.rankV2.lifetimeXp, 170);
    assert.equal(Object.keys(context.appData.rankV2.processedEvents).length, 1);

    const newId = Date.now();
    context.appData.historyItems.push({
        id: newId,
        dataISO: new Date(newId).toISOString().slice(0, 10),
        materia: 'Química',
        tempoSegundos: 600
    });
    context.saveAppData();
    await wait(220);

    assert.equal(context.appData.rankV2.lifetimeXp, 280);
    assert.equal(Object.keys(context.appData.rankV2.processedEvents).length, 3);

    context.saveAppData();
    await wait(180);
    assert.equal(context.appData.rankV2.lifetimeXp, 280);
    assert.equal(Object.keys(context.appData.rankV2.processedEvents).length, 3);
});

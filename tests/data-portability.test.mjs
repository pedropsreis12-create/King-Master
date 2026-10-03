import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../data-portability.js', import.meta.url), 'utf8');

test('backup completo incorpora fotos privadas vinculadas aos registros', async () => {
    let lastBlob = null;
    let clicked = false;
    class TestBlob {
        constructor(parts, options) {
            this.parts = parts;
            this.type = options?.type;
            lastBlob = this;
        }
    }
    const anchor = { click() { clicked = true; }, remove() {} };
    const context = vm.createContext({
        console,
        Blob: TestBlob,
        URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
        setTimeout: callback => { callback(); return 1; },
        document: {
            readyState: 'loading',
            addEventListener() {},
            getElementById: () => null,
            createElement: tag => tag === 'a' ? anchor : {},
            body: { appendChild() {} }
        },
        appData: {
            cycleItems: [], historyItems: [], studySchedule: {}, simuladosItems: [], redacaoItems: [],
            revisoesItems: [{ id: 10, imagem: { id: 'review-image' } }],
            cadernoErrosItems: [{ id: 20, imagens: [{ id: 'error-image' }] }]
        },
        kingCloud: {
            getReviewImage: async id => ({ id, name: 'Revisão', type: 'image/webp', width: 10, height: 10, dataUrl: 'data:image/webp;base64,AAAA' }),
            getErrorImage: async id => ({ id, name: 'Erro', context: 'rule', type: 'image/png', width: 20, height: 20, dataUrl: 'data:image/png;base64,BBBB' })
        },
        showToast() {}
    });
    context.window = context;

    vm.runInContext(source, context, { filename: 'data-portability.js' });
    await context.KingDataPortability.exportData();

    assert.equal(clicked, true);
    const payload = JSON.parse(lastBlob.parts.join(''));
    assert.equal(payload.version, 2);
    assert.equal(payload.privateImages.reviews.length, 1);
    assert.equal(payload.privateImages.errors.length, 1);
    assert.equal(payload.privateImages.reviews[0].reviewId, '10');
    assert.equal(payload.privateImages.errors[0].errorId, '20');
    assert.equal(payload.privateImages.errors[0].context, 'rule');
    assert.deepEqual(payload.warnings, []);
});

test('restauração mantém compatibilidade e envia fotos de volta à nuvem', () => {
    assert.match(source, /parsed\?\.format === 'king-master-backup' \? parsed\.data : parsed/);
    assert.match(source, /cloud\.saveReviewImage\(image\)/);
    assert.match(source, /cloud\.saveErrorImage\(image\)/);
    assert.match(source, /collectPrivateImages\(appData, \{ strict: true \}\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import '../periodic-table-data.js';
import '../periodic-table-core.js';

const data = globalThis.KingPeriodicData;
const core = globalThis.KingPeriodicCore;
const [html, css, script, ui, serviceWorker, viteConfig] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../periodic-table.css', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../periodic-table.js', import.meta.url), 'utf8'),
    readFile(new URL('../sw.js', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
]);

test('tabela contém 118 elementos únicos com posições válidas', () => {
    assert.equal(data.length, 118);
    assert.equal(new Set(data.map(element => element.symbol)).size, 118);
    assert.equal(new Set(data.map(element => element.number)).size, 118);
    assert.equal(data[0].name, 'Hidrogênio');
    assert.equal(data[117].symbol, 'Og');
    const positions = data.map(element => {
        assert.equal(element.number, data.indexOf(element) + 1);
        assert.ok(element.name && element.mass && element.category);
        const position = core.position(element.number);
        assert.ok(position && position.row >= 1 && position.row <= 9);
        assert.ok(position.column >= 1 && position.column <= 18);
        return `${position.row}:${position.column}`;
    });
    assert.equal(new Set(positions).size, 118);
    assert.deepEqual(core.position(26), { row: 4, column: 8, period: 4, group: 8 });
    assert.deepEqual(core.position(57), { row: 8, column: 4, period: 6, group: null });
    assert.deepEqual(core.position(118), { row: 7, column: 18, period: 7, group: 18 });
});

test('lantanídeos e actinídeos aparecem nas duas linhas próprias abaixo da tabela', () => {
    const grid = { innerHTML: '', addEventListener() {}, querySelectorAll() { return []; } };
    const plain = { innerHTML: '', textContent: '', value: '', hidden: false, addEventListener() {}, setAttribute() {}, querySelectorAll() { return []; } };
    const dock = { append() {} };
    const nodes = {
        'periodic-table': { classList: { contains: () => true }, addEventListener() {} },
        periodicGrid: grid,
        periodicDetail: { innerHTML: '', parentElement: dock, classList: { toggle() {} }, addEventListener() {} },
        periodicDetailDock: dock,
        periodicTableScroll: { clientWidth: 0, addEventListener() {} },
        periodicSearch: { ...plain },
        periodicSuggestions: { ...plain },
        periodicClear: { ...plain },
        periodicResultCount: { ...plain },
        periodicLegend: { ...plain }
    };
    runInNewContext(ui, {
        document: { getElementById: id => nodes[id], addEventListener() {} },
        window: { addEventListener() {} },
        globalThis: { KingPeriodicData: data, KingPeriodicCore: core },
        Map, Array, Number, String
    });
    assert.match(grid.innerHTML, /data-element="57" style="grid-column:5;grid-row:10"/);
    assert.match(grid.innerHTML, /data-element="71" style="grid-column:19;grid-row:10"/);
    assert.match(grid.innerHTML, /data-element="89" style="grid-column:5;grid-row:11"/);
    assert.match(grid.innerHTML, /data-element="103" style="grid-column:19;grid-row:11"/);
});

test('busca aceita nome com ou sem acento, símbolo, número e família', () => {
    const iron = data[25];
    assert.equal(core.matches(iron, 'ferro'), true);
    assert.equal(core.matches(iron, 'fe'), true);
    assert.equal(core.matches(iron, '26'), true);
    assert.equal(core.matches(data[7], 'oxigenio'), true);
    assert.equal(core.matches(iron, '', 'transition'), true);
    assert.equal(core.matches(iron, '', 'noble'), false);
    assert.equal(core.stateLabel('Gas'), 'Gasoso');
});

test('nova aba é navegável, funciona offline e respeita as opções de animação', () => {
    assert.match(html, /data-section="periodic-table" aria-controls="periodic-table"/);
    assert.match(html, /<section id="periodic-table" class="content-section/);
    for (const name of ['periodic-table-data.js', 'periodic-table-core.js', 'periodic-table.js', 'periodic-table.css']) {
        assert.ok(html.includes(name));
        assert.ok(serviceWorker.includes(`'./${name}'`));
    }
    assert.match(script, /sectionId === 'periodic-table'\) window\.KingPeriodic\?\.render/);
    assert.match(viteConfig, /'periodic-table-data\.js', 'periodic-table-core\.js', 'periodic-table\.js'/);
    assert.match(css, /@keyframes periodic-float/);
    assert.match(css, /html\[data-motion-level="off"\] \.periodic-figure \{ animation: none/);
    assert.match(css, /prefers-reduced-motion: reduce/);
});

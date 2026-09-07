import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const window = {};
vm.runInNewContext(await readFile(new URL('../military-insignia.js', import.meta.url), 'utf8'), { window });
const render = window.KingMilitaryInsignia.render;
const themes = ['soldado', 'cabo', 'terceiro-sargento', 'segundo-sargento', 'primeiro-sargento', 'subtenente', 'aspirante', 'segundo-tenente', 'primeiro-tenente', 'capitao', 'major', 'tenente-coronel', 'coronel', 'general-brigada', 'general-divisao', 'general-exercito', 'marechal'];

test('all 17 military ranks have standalone, constrained SVG insignia', () => {
    for (const theme of themes) {
        const svg = render(theme);
        assert.match(svg, /viewBox="0 0 64 92"/);
        assert.match(svg, /preserveAspectRatio="xMidYMid meet"/);
        assert.match(svg, /aria-label="[^"]+"/);
        assert.doesNotMatch(svg, /<script|<foreignObject|\son\w+=|\sid=|href=/i);
    }
    assert.equal(render('entidade'), '');
    assert.equal(render('__proto__'), '');
});

test('sergeants preserve divisa grouping and the separator', () => {
    for (const [theme, count, divider] of [['soldado',1,0],['cabo',2,0],['terceiro-sargento',3,0],['segundo-sargento',4,1],['primeiro-sargento',5,1]]) {
        const svg = render(theme);
        assert.equal((svg.match(/class="insignia-chevron"/g) || []).length, count);
        assert.equal((svg.match(/class="insignia-chevron-divider"/g) || []).length, divider);
    }
});

test('generals carry their corresponding star count and Army emblem', () => {
    for (const [theme, count] of [['general-brigada',2],['general-divisao',3],['general-exercito',4],['marechal',5]]) {
        assert.match(render(theme), new RegExp(`data-star-count="${count}"`));
        assert.match(render(theme), /class="insignia-army-emblem"/);
    }
});

test('all referenced landscapes exist as WebP assets', async () => {
    const source = await readFile(new URL('../rank-art.js', import.meta.url), 'utf8');
    const names = [...new Set([...source.matchAll(/art: '([a-z0-9-]+)'/g)].map(match => match[1]))];
    assert.equal(names.length, 12);
    for (const name of names) {
        const asset = await readFile(new URL(`../assets/rank-${name}.webp`, import.meta.url));
        assert.equal(asset.toString('ascii', 0, 4), 'RIFF', name);
        assert.equal(asset.toString('ascii', 8, 12), 'WEBP', name);
    }
});

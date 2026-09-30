import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../profile-overhaul.js', import.meta.url), 'utf8');

test('perfil mantém liga sazonal e título vitalício semanticamente separados', () => {
    assert.match(source, /leagueRemaining:/);
    assert.match(source, /Faltam \$\{formatNumber\(rank\.leagueRemaining\)\} pontos para avançar/);
    assert.match(source, /text\('profileLeagueName', `Título · \$\{rank\.title\}`\)/);
});

test('perfil não corta a coleção verificada de conquistas', () => {
    assert.doesNotMatch(source, /local\.filter\(item => !externalIds\.has\(item\.id\)\)\]\.slice\(0, 15\)/);
    assert.match(source, /return \[\.\.\.external, \.\.\.local\.filter\(item => !externalIds\.has\(item\.id\)\)\];/);
});

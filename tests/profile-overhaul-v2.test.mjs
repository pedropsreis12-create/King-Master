import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../profile-overhaul.js', import.meta.url), 'utf8');

test('perfil mantém liga sazonal e título vitalício semanticamente separados', () => {
    assert.match(source, /leagueRemaining:/);
    assert.match(source, /Faltam \$\{formatNumber\(rank\.leagueRemaining\)\} pontos para avançar/);
    assert.match(source, /text\('profileLeagueName', \/\^liga/);
});

test('perfil mostra somente as conquistas verificadas e oferece visualização ampliada', () => {
    assert.match(source, /return external;/);
    assert.match(source, /function toggleAchievementsFullscreen\(/);
    assert.match(source, /achievementTier: 'all'/);
    assert.doesNotMatch(source, /createNavigation\(root\);/);
});

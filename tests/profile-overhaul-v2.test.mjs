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

test('busca de usuários tem aba própria e o catálogo mostra cada divisão', () => {
    assert.match(source, /\['search', 'Pesquisar usuário'\]/);
    assert.match(source, /function createUserSearch\(root\)/);
    assert.match(source, /id: 'perfil-busca'/);
    assert.match(source, /for \(let division = 1; division <= divisions; division \+= 1\)/);
    assert.match(source, /Ver todas as 22 classificações/);
});

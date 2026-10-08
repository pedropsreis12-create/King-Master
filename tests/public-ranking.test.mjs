import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');
const ranking = await readFile(new URL('../public-ranking.js', import.meta.url), 'utf8');
const indexes = JSON.parse(await readFile(new URL('../firestore.indexes.json', import.meta.url), 'utf8'));

test('placar é opcional e só publica um resumo limitado do perfil', () => {
    assert.match(ranking, /async function join\(/);
    assert.match(ranking, /async function leave\(/);
    assert.match(ranking, /deleteDoc\(ownDocument\(user\)\)/);
    assert.match(rules, /request\.auth\.uid == userId/);
    assert.match(rules, /hasOnly\(\['uid', 'displayName', 'seasonId', 'score', 'level', 'updatedAt'\]\)/);
    assert.doesNotMatch(ranking, /email:|historyItems:|cadernoErrosItems:/);
});

test('placar ordena a temporada com índice composto e limita a consulta', () => {
    assert.match(ranking, /where\('seasonId', '==', seasonId\)/);
    assert.match(ranking, /orderBy\('score', 'desc'\)/);
    assert.match(ranking, /limit\(30\)/);
    assert.deepEqual(indexes.indexes[0].fields, [
        { fieldPath: 'seasonId', order: 'ASCENDING' },
        { fieldPath: 'score', order: 'DESCENDING' }
    ]);
});

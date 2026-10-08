import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Hoje não mostra plano automático, ciclo semanal ou mapa de calor', () => {
    assert.doesNotMatch(html, /id="(?:autopilotPanel|studyWeeklyCard|studyHeatmapToday)"/);
    assert.doesNotMatch(html, /<script src="autopilot\.js/);
    assert.doesNotMatch(html, /href="autopilot\.css/);
});

test('o histórico de estudo e a configuração do plano continuam disponíveis', () => {
    assert.match(html, /id="studyHeatmapHistory"/);
    assert.match(html, /KingStudyEvolution\.openProfile\(\)/);
    assert.match(html, /id="studyDeadlinesToday"/);
});

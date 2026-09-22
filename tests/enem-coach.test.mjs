import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, coach, coachStyle, assistant, cloud] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../enem-coach.js', import.meta.url), 'utf8'),
  readFile(new URL('../enem-coach.css', import.meta.url), 'utf8'),
  readFile(new URL('../ai-assistant.js', import.meta.url), 'utf8'),
  readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8')
]);

test('personal ENEM plan persists the agreed routine and goals', () => {
  assert.match(script, /goalCourse: 'Direito'/);
  assert.match(script, /goalUniversity: 'UESC'/);
  assert.match(script, /blockMinutes: 100/);
  assert.match(script, /minimumGoalMinutes: 120/);
  assert.match(script, /questionsMin: 15, questionsMax: 20/);
  assert.match(script, /reviewIntervals: \[1, 7, 21\]/);
  assert.match(html, /id="plano-enem"/);
  assert.match(html, /Direito na UESC/);
});

test('Today chooses one action and supports a deliberate reduced day', () => {
  assert.match(html, /id="todayCommandCenter"/);
  assert.match(coach, /function nextAction/);
  assert.match(coach, /function runNextAction/);
  assert.match(coach, /function toggleSurvivalMode/);
  assert.match(coach, /DIA DIFÍCIL · META 2H/);
  assert.match(coachStyle, /\.today-command-center/);
});

test('diagnostic, discipline and weekly writing path are functional workspaces', () => {
  assert.match(html, /id="diagnosticForm"/);
  assert.match(html, /id="disciplineChecklist"/);
  assert.match(html, /id="writingPathSteps"/);
  assert.match(coach, /function saveDiagnostic/);
  assert.match(coach, /function toggleDiscipline/);
  assert.match(coach, /function advanceWritingPath/);
});

test('AI coach receives the personal plan and uses a firm respectful contract', () => {
  assert.match(assistant, /planoEnem:/);
  assert.match(assistant, /modoTreinador/);
  assert.match(cloud, /Você é o Treinador do QG/);
  assert.match(cloud, /firme, direto e respeitoso/);
  assert.match(cloud, /Nunca humilhe/);
});

test('photo-assisted error capture leaves the personal cause as the reflection', () => {
  assert.match(html, /id="errorAiScanButton"/);
  assert.match(html, /id="errorCauseInput"[^>]+required/);
  assert.match(script, /function analisarImagemCadernoErroComIa/);
  assert.match(cloud, /async analyzeStudyImage/);
  assert.match(script, /explique por que você errou/);
});

test('review inbox advances new captures through the 1-7-21 cycle', () => {
  assert.match(script, /spacedPlan: item\.spacedPlan !== false/);
  assert.match(script, /repetitionIndex/);
  assert.match(script, /const atrasos = \[6, 14\]/);
  assert.match(script, /Ciclo \$\{Math\.min\(3/);
});

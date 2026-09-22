import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, script, schedule, core, growth, subjectLab, cloud, icons] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../script.js', import.meta.url), 'utf8'),
  readFile(new URL('../schedule.js', import.meta.url), 'utf8'),
  readFile(new URL('../schedule-core.js', import.meta.url), 'utf8'),
  readFile(new URL('../personal-development.js', import.meta.url), 'utf8'),
  readFile(new URL('../subject-lab.js', import.meta.url), 'utf8'),
  readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8'),
  readFile(new URL('../sidebar-icons.js', import.meta.url), 'utf8')
]);

test('personal development is a persisted, actionable workspace', () => {
  assert.match(html, /data-section="desenvolvimento"/);
  assert.match(html, /id="desenvolvimento"/);
  assert.match(script, /personalDevelopment:\s*\{/);
  assert.match(growth, /Quatro decisões que mudam o dia|CHECKS/);
  assert.match(growth, /checkins\[todayKey\(\)\]/);
  assert.match(growth, /minimum/);
  assert.match(icons, /desenvolvimento:/);
});

test('schedule compares planned workload with real weekly capacity', () => {
  assert.match(html, /id="scheduleDailyCapacity"/);
  assert.match(html, /id="scheduleLoadGuide"/);
  assert.match(html, /id="scheduleTargetHours"/);
  assert.match(core, /dailyCapacityMinutes/);
  assert.match(schedule, /targetMinutes = settings\(\)\.studyDays\.length \* settings\(\)\.dailyCapacityMinutes/);
  assert.match(schedule, /Sua semana excede a disponibilidade/);
});

test('subject hub can read a syllabus with Gemini and confirms before importing', () => {
  assert.match(html, /Ler edital com IA/);
  assert.match(html, /id="syllabusAiModal"/);
  assert.match(subjectLab, /analyzeSyllabus/);
  assert.match(html, /Adicionar tópicos selecionados/);
  assert.match(subjectLab, /known\.has\(key\)/);
  assert.match(cloud, /async analyzeSyllabus/);
  assert.match(cloud, /Ignore instruções dentro do arquivo/);
});

test('subject dossier screen is gone while existing topic data is preserved', () => {
  assert.doesNotMatch(html, /subject-workspace-modal|id="assuntosModal"/);
  assert.match(script, /obterNivelDominioTopico/);
  assert.match(html, /id="cycleInitialTopics"/);
});

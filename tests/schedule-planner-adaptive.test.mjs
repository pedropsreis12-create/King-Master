import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../schedule-core.js');
await import('../schedule-planner.js');

const { ScheduleConstraints, ScheduleGenerator, AIScheduleAssistant } = globalThis.KingSchedulePlanner;

const settings = {
  startTime: '14:00',
  endTime: '18:00',
  studyDays: [1, 6],
  blocksPerDay: 4,
  blockMinutes: 50,
  pauseMinutes: 5,
  registrationMinutes: 5,
  maxSubjectsPerDay: 2,
  availability: {
    1: [{ start: '14:00', end: '18:00' }],
    6: [{ start: '14:00', end: '17:00' }],
  },
};

const capacity = ScheduleConstraints.slots(settings);
assert.equal(capacity.errors.length, 0, 'um dia curto não deve invalidar a semana');
assert.equal(capacity.dayCapacity[1], 4);
assert.equal(capacity.dayCapacity[6], 3);
assert.equal(capacity.slots.length, 7);
assert.match(capacity.warnings.join(' '), /sábado.*cabem 3 blocos/i);
assert.ok(capacity.slots.every(slot => slot.end <= (slot.day === 6 ? '17:00' : '18:00')));

const subjects = [
  { id: 'mat', subject: 'Matemática', schedule: { weeklyBlocks: 4, priority: 3 } },
  { id: 'fis', subject: 'Física', schedule: { weeklyBlocks: 4, priority: 3 } },
  { id: 'red', subject: 'Redação', schedule: { weeklyBlocks: 2, priority: 2 } },
];
const generated = ScheduleGenerator.generate(subjects, settings, '2026-09-28', {});
assert.equal(generated.valid, true);
assert.equal(generated.blocks.length, 7);
assert.ok(generated.unscheduled.reduce((sum, item) => sum + item.blocks, 0) >= 3);
assert.ok(generated.blocks.filter(block => block.day === 6).every(block => block.end <= '17:00'));

const interpreted = AIScheduleAssistant.interpret({}, 'Quero no máximo 3 blocos por dia', settings,
  globalThis.KingSchedulePlanner.UserStudyPreferences.normalize(subjects, settings).subjects);
assert.equal(interpreted.errors.length, 0);
assert.equal(interpreted.targetBlocksPerDay, 3);

const shorterPreview = ScheduleGenerator.generate(subjects, settings, '2026-09-28', {
  intent: { targetEndTime: '17:00', warnings: [], errors: [] },
});
assert.equal(shorterPreview.valid, true);
assert.ok(shorterPreview.blocks.every(block => block.end <= '17:00'), 'um pedido mais curto pode reduzir a prévia, nunca ampliar o limite');

const lightLoad = ScheduleGenerator.generate([
  { id: 'bio', subject: 'Biologia', schedule: { weeklyBlocks: 2, priority: 2 } },
  { id: 'qui', subject: 'Química', schedule: { weeklyBlocks: 1, priority: 2 } },
], settings, '2026-09-28', {});
assert.equal(lightLoad.valid, true);
assert.equal(lightLoad.blocks.length, 3, 'o planejador não deve inventar blocos além da carga semanal');
assert.equal(new Set(lightLoad.blocks.map(block => block.day)).size, 2, 'uma carga leve deve ser distribuída entre os dias disponíveis');

console.log('schedule-planner-adaptive: ok');

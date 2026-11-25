import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(fs.readFileSync(new URL('../account-reset.js', import.meta.url), 'utf8'), { window });
const { zerarProgresso } = window.KingAccountReset;
const padrao = { accountUid: '', cycleItems: [], historyItems: [], redacaoItems: [], revisoesItems: [], totalStudySeconds: 0,
    weeklyChart: [0, 0, 0, 0, 0, 0, 0], profileName: 'Estudante', cadernoCentral: { revisados: {}, legendaCores: {} },
    studySchedule: { settings: {}, weeks: {}, suggestions: [] }, flashcards: { decks: [], cards: [] }, lastModifiedAt: 0 };

test('zerar progresso mantém matérias e assuntos zerados e apaga os registros', () => {
    const dados = { accountUid: 'pedro', profileName: 'Pedro', themeColor: '#2563eb', totalStudySeconds: 99999,
        weeklyChart: [1, 2, 3, 4, 5, 6, 7], historyItems: [{ id: 1 }], redacaoItems: [{ id: 2 }], revisoesItems: [{ id: 3 }],
        flashcards: { decks: [{ id: 'd' }], cards: [{ id: 'c' }] }, metas: [{ id: 'm' }], temasRedacao: [{ titulo: 'T' }],
        quickNotes: [{ id: 'n' }], studySchedule: { settings: { startTime: '08:00' }, weeks: { w: {} }, suggestions: [] },
        cycleItems: [{ id: 10, subject: 'Física', color: '#099268', area: 'natureza', executedMin: 500, questoes: 80, acertos: 60, erros: 20,
            topicos: [{ id: 't', nome: 'Cinemática', temaId: 'x', concluido: true, nivelDominio: 3, vezesEstudado: 4, questoes: 30, acertos: 25, erros: 5,
                proximaRevisaoEm: '2026-12-01', trilha: { etapa: 2 }, caderno: 'minhas notas' }] }] };
    const novo = zerarProgresso(dados, padrao, 123);
    assert.equal(novo.accountUid, 'pedro');
    assert.equal(novo.profileName, 'Pedro');
    assert.equal(novo.themeColor, '#2563eb');
    assert.equal(novo.totalStudySeconds, 0);
    assert.equal(novo.historyItems.length + novo.redacaoItems.length + novo.revisoesItems.length + novo.flashcards.cards.length + novo.metas.length, 0);
    assert.equal(Object.keys(novo.studySchedule.weeks).length, 0);
    assert.equal(novo.studySchedule.settings.startTime, '08:00');
    assert.equal(novo.quickNotes.length, 1);
    assert.equal(novo.temasRedacao.length, 1);
    const materia = novo.cycleItems[0];
    assert.equal(materia.subject, 'Física');
    assert.equal(materia.area, 'natureza');
    assert.equal(materia.executedMin + materia.questoes + materia.acertos + materia.erros, 0);
    const assunto = materia.topicos[0];
    assert.equal(assunto.nome, 'Cinemática');
    assert.equal(assunto.temaId, 'x');
    assert.equal(assunto.caderno, 'minhas notas');
    assert.equal(assunto.concluido, false);
    assert.equal(assunto.nivelDominio + assunto.vezesEstudado + assunto.questoes, 0);
    assert.equal(assunto.proximaRevisaoEm, undefined);
    assert.equal(assunto.trilha, undefined);
    assert.equal(novo.lastModifiedAt, 123);
    assert.equal(dados.cycleItems[0].questoes, 80, 'não altera o objeto original');
});

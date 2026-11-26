import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
const inicio = script.indexOf('function reconciliarHistoricoComMateriasAtuais()');
const fim = script.indexOf('reconciliarHistoricoComMateriasAtuais();', inicio);
const reconciliar = script.slice(inicio, fim);

function rodarLimpeza(historyItems, cycleItems) {
    const removidas = [];
    const ctx = {
        appData: { historyItems, cycleItems, lastModifiedAt: 0 },
        normalizarRevisaoTexto: v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(),
        descontarSessoesDosTotais: lista => removidas.push(...lista),
        localStorage: { setItem() {} }, Date, Number, String, Set, Math, Object,
    };
    vm.runInNewContext(`${reconciliar}; reconciliarHistoricoComMateriasAtuais();`, ctx);
    return { restantes: ctx.appData.historyItems.map(i => i.id), removidas: removidas.map(i => i.id) };
}

test('abrir o site não apaga sessões de Redação, revisão geral nem do banco de questões', () => {
    const { restantes, removidas } = rodarLimpeza([
        { id: 1, materia: 'Redação', subjectId: '', tempoSegundos: 6240 },
        { id: 2, materia: 'Revisão geral / questões mistas', subjectId: '' },
        { id: 3, materia: 'Biologia', subjectId: 'bio', origem: 'banco-questoes' },
        { id: 4, materia: 'Química', subjectId: 'qui-excluida', tempoSegundos: 600 },
        { id: 5, materia: 'Física', subjectId: '' },
        { id: 6, materia: 'Matemática', subjectId: 'mat' },
    ], [{ id: 'bio', subject: 'Biologia', topicos: [] }, { id: 'mat', subject: 'Matemática', topicos: [] }]);
    assert.deepEqual(restantes, [1, 2, 3, 5, 6]);
    assert.deepEqual(removidas, [4], 'só sai o registro ligado a uma matéria excluída');
});

test('a recuperação acha nas cópias só as sessões apagadas pela limpeza antiga', () => {
    const ctx = { window: { addEventListener() {} }, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null }, setTimeout, clearTimeout, Date, Math, Number, String, Set, Map, Object, Array, JSON, Promise };
    vm.runInNewContext(`${fs.readFileSync(new URL('../auto-backup.js', import.meta.url), 'utf8')}; this.B = window.KingAutoBackup;`, ctx);
    const atual = { cycleItems: [{ id: 'bio', subject: 'Biologia' }], historyItems: [{ id: 10, materia: 'Biologia', subjectId: 'bio' }] };
    const copias = [
        { data: { historyItems: [{ id: 10, materia: 'Biologia', subjectId: 'bio' }, { id: 11, materia: 'Redação', subjectId: '', tempoSegundos: 6240 }, { id: 12, materia: 'Biologia', subjectId: 'bio' }] } },
        { data: { historyItems: [{ id: 11, materia: 'Redação', subjectId: '', tempoSegundos: 6240 }, { id: 13, materia: 'Sem matéria', subjectId: '' }, { id: 14, materia: 'Química', subjectId: 'qui' }] } },
    ];
    const achadas = Array.from(ctx.B.sessoesApagadas(copias, atual)).map(i => i.id);
    assert.deepEqual(achadas, [11], 'não devolve sessões apagadas de propósito (com matéria, sem matéria) nem repete');
});

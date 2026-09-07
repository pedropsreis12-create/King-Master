import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const window = {};
vm.runInNewContext(await readFile(new URL('../cloud-state.js', import.meta.url), 'utf8'), { window });
const state = window.KingCloudState;

test('a new device always downloads an existing account before it can upload', () => {
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:8, localModifiedAt:999999, identity:null, uid:'pedro' }), 'download');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:8, localModifiedAt:999999, identity:{uid:'other'}, uid:'pedro' }), 'download');
});
test('a new account migrates the local data because no cloud document exists', () => {
    assert.equal(state.decideInitial({ remoteExists:false, localModifiedAt:10, identity:null, uid:'pedro' }), 'upload');
});
test('switching accounts never copies the previous account into a new cloud document', () => {
    assert.equal(state.decideInitial({ remoteExists:false, localModifiedAt:99, identity:{uid:'conta-a'}, uid:'conta-b' }), 'reset');
});
test('a known device downloads newer cloud revisions and uploads only its own unsaved edit', () => {
    const identity = { uid:'pedro', cloudRevision:5, lastLocalRevision:100 };
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:6, localModifiedAt:150, identity, uid:'pedro' }), 'download');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:5, localModifiedAt:150, identity, uid:'pedro' }), 'upload');
    assert.equal(state.decideInitial({ remoteExists:true, remoteRevision:5, localModifiedAt:100, identity, uid:'pedro' }), 'ready');
});
test('malformed identity storage cannot authorize a local overwrite', () => {
    const storage = { getItem: () => '{broken' };
    assert.equal(state.parseIdentity(storage), null);
});

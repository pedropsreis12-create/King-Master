import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const palette = await readFile(new URL('../command-palette.js', import.meta.url), 'utf8');
const assistant = await readFile(new URL('../ai-assistant.js', import.meta.url), 'utf8');

test('busca rápida e assistente usam atalhos distintos', () => {
    assert.match(palette, /\(event\.ctrlKey \|\| event\.metaKey\) && !event\.shiftKey/);
    assert.match(assistant, /\(event\.ctrlKey \|\| event\.metaKey\) && event\.shiftKey/);
});

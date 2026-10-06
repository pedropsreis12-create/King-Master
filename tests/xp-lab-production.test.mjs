import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('laboratório experimental não aparece no site publicado', async () => {
    const [html, app, css] = await Promise.all(['index.html', 'script.js', 'style.css'].map(name =>
        readFile(new URL(`../${name}`, import.meta.url), 'utf8')));
    assert.match(html, /id="xpTestPanel"[^>]* hidden>/);
    assert.match(app, /XP_LAB_LOCAL = \/\^\(localhost\|127\\\.0\\\.0\\\.1\)\$\//);
    assert.match(app, /painel\.hidden = !XP_LAB_LOCAL/);
    assert.match(css, /\.xp-test-panel\[hidden\] \{ display: none !important; \}/);
});

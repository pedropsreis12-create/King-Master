import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('laboratório aparece somente para acesso mestre e a prévia não salva XP', async () => {
    const [html, app, css, access, rules] = await Promise.all(['index.html', 'script.js', 'style.css', 'master-access.js', 'firestore.rules'].map(name =>
        readFile(new URL(`../${name}`, import.meta.url), 'utf8')));
    assert.match(html, /id="xpTestPanel"[^>]* hidden>/);
    assert.match(app, /XP_LAB_LOCAL = \/\^\(localhost\|127\\\.0\\\.0\\\.1\)\$\//);
    assert.match(app, /painel\.hidden = !\(XP_LAB_LOCAL \|\| XP_LAB_ADMIN\)/);
    assert.match(app, /function snapshotLaboratorioMestre\(data\)/);
    assert.match(app, /const previewState = structuredClone\(source\)/);
    assert.doesNotMatch(app.slice(app.indexOf('function snapshotLaboratorioMestre'), app.indexOf('window.KingMasterLab')), /saveAppData|localStorage|setDoc/);
    assert.match(css, /\.xp-test-panel\[hidden\] \{ display: none !important; \}/);
    assert.match(access, /doc\(db, 'siteAdminInvites', activeEmail\)/);
    assert.match(access, /role\?\.role === 'owner' && role\?\.active === true/);
    assert.match(rules, /match \/siteAdminInvites\/\{email\}/);
    assert.match(rules, /request\.auth\.token\.email_verified == true/);
    assert.match(rules, /request\.auth\.token\.firebase\.sign_in_provider == 'google\.com'/);
    assert.match(rules, /allow list, create, update, delete: if false/);
});

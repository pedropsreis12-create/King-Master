import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, cloud, script, usability, resetPage, resetScript, vite, resetEmail] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../cloud-sync.js', import.meta.url), 'utf8'),
    readFile(new URL('../script.js', import.meta.url), 'utf8'),
    readFile(new URL('../usability.css', import.meta.url), 'utf8'),
    readFile(new URL('../recuperar.html', import.meta.url), 'utf8'),
    readFile(new URL('../password-reset.js', import.meta.url), 'utf8'),
    readFile(new URL('../vite.config.js', import.meta.url), 'utf8'),
    readFile(new URL('../email-templates/password-reset.html', import.meta.url), 'utf8')
]);

test('account creation requires matching strong passwords and a human verification token', () => {
    assert.match(html, /id="authPasswordConfirm"[^>]+minlength="8"/);
    assert.match(html, /id="authHumanCheck"[^>]+role="checkbox"/);
    assert.match(cloud, /password !== authPasswordConfirm\?\.value/);
    assert.match(cloud, /Date\.now\(\) >= humanVerifiedUntil/);
    assert.match(cloud, /getToken\(appCheck, true\)/);
});

test('Apple sign-in is removed while the iOS home-screen icon remains', () => {
    assert.doesNotMatch(html, /authAppleBtn|Continuar com Apple/);
    assert.doesNotMatch(cloud, /OAuthProvider\(['"]apple\.com|authApple|appleProvider/);
    assert.match(html, /rel="apple-touch-icon"/);
});

test('password recovery is neutral, localized and ships a branded action handler', () => {
    assert.match(cloud, /auth\.languageCode = 'pt-BR'/);
    assert.match(cloud, /Se existir uma conta com este e-mail/);
    assert.match(resetScript, /verifyPasswordResetCode/);
    assert.match(resetScript, /confirmPasswordReset/);
    assert.match(resetPage, /Recuperação segura de conta/);
    assert.match(vite, /recuperar\.html/);
    assert.match(vite, /password-reset\.js/);
});

test('password recovery email is branded, responsive and keeps Firebase placeholders safe', () => {
    assert.match(resetEmail, /Redefina sua senha \| King Master/);
    assert.match(resetEmail, /href="%LINK%"/);
    assert.match(resetEmail, /%EMAIL%/);
    assert.match(resetEmail, /@media screen and \(max-width:640px\)/);
    assert.match(resetEmail, /Se você não solicitou esta alteração/);
    assert.doesNotMatch(resetEmail, /<script|<form|\son[a-z]+=/i);
});

test('settings keep navigation visible and reduced motion preserves short transitions', () => {
    assert.match(script, /if \(document\.getElementById\('settingsPanel'\)\?\.classList\.contains\('active'\)\)/);
    assert.doesNotMatch(usability, /animation-duration:\s*\.001ms/);
    assert.match(usability, /html\.reduce-motion[\s\S]+transition-duration:\s*\.14s/);
});

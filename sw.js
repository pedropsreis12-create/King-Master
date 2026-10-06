const APP_URL = new URL('./', self.location).href;
const CACHE_VERSION = 'king-master-20261006-cadernos-trilhas-v2';
const APP_SHELL = [
    './',
    './index.html',
    './privacidade.html',
    './manifest.webmanifest',
    './style.css',
    './usability.css',
    './schedule.css',
    './schedule-planner.css',
    './script.js',
    './topic-core.js',
    './review-trail-core.js',
    './notebook-core.js',
    './notebook.js',
    './study-evolution-core.js',
    './study-evolution.js',
    './topic-hierarchy.css',
    './agenda-workspace.js',
    './agenda-workspace.css',
    './autopilot-core.js',
    './autopilot.js',
    './autopilot.css',
    './practice-core.js',
    './practice.js',
    './practice.css',
    './error-ai.css',
    './schedule-core.js',
    './schedule-planner.js',
    './schedule.js',
    './subject-picker.js',
    './subject-picker.css',
    './habit-core.js',
    './academic-context.js',
    './mock-exam-core.js',
    './mock-exams.js',
    './mock-exams.css',
    './flashcards-core.js',
    './flashcards.js',
    './flashcards.css',
    './notes-workspace.css',
    './productivity.js',
    './rank-system-v2.js',
    './rank-integration-v2.js',
    './accessibility-v2.js',
    './profile-overhaul.js',
    './adaptive-design.css',
    './profile-overhaul.css',
    './command-palette.css',
    './command-palette.js',
    './modal-accessibility.js',
    './data-portability.js',
    './assets/app-icon-192.png',
    './assets/app-icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_VERSION)
        .then(cache => cache.addAll(APP_SHELL))
        .catch(() => undefined)
        .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(Promise.all([
        caches.keys().then(keys => Promise.all(keys
            .filter(key => key.startsWith('king-master-') && key !== CACHE_VERSION)
            .map(key => caches.delete(key)))),
        self.clients.claim()
    ]));
});

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === 'navigate') {
        event.respondWith(fetch(request)
            .then(response => {
                if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', response.clone()));
                return response;
            })
            .catch(async () => (await caches.match(request)) || (await caches.match('./index.html'))));
        return;
    }

    if (!['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)) return;
    const cacheKey = new Request(`${url.origin}${url.pathname}`);

    // Código e estilos precisam priorizar a versão publicada; o cache é apenas
    // uma saída offline. Isso evita que um arquivo antigo sobreviva a um deploy.
    if (request.destination === 'script' || request.destination === 'style') {
        event.respondWith(fetch(request).then(response => {
            if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(cacheKey, response.clone()));
            return response;
        }).catch(() => caches.match(cacheKey)));
        return;
    }

    event.respondWith(caches.match(cacheKey).then(cached => {
        const refreshed = fetch(request).then(response => {
            if (response.ok) caches.open(CACHE_VERSION).then(cache => cache.put(cacheKey, response.clone()));
            return response;
        }).catch(() => cached);
        return cached || refreshed;
    }));
});
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const existing = clients.find(client => client.url.startsWith(APP_URL));
        return existing ? existing.focus() : self.clients.openWindow(APP_URL);
    }));
});
self.addEventListener('periodicsync', event => {
    if (event.tag === 'king-master-daily-reminder') event.waitUntil(self.registration.showNotification('King Master', {
        body: 'Hora de avançar mais uma missão de estudos.', icon: './assets/app-icon-192.png', badge: './assets/app-icon-192.png', tag: 'king-master-daily'
    }));
});

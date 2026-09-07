const APP_URL = new URL('./', self.location).href;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
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

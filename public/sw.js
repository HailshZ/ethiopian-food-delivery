// sw.js – Service Worker for push notifications
self.addEventListener('push', function (event) {
    let data = { title: 'EthioFood', body: 'You have a new notification', url: '/' };
    try {
        data = event.data.json();
    } catch (e) {
        data.body = event.data ? event.data.text() : data.body;
    }

    const options = {
        body: data.body,
        icon: data.icon || '/images/icon-192.png',
        badge: data.badge || '/images/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'EthioFood Delivery', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Focus existing tab if open
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new tab
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});

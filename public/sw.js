self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'BusTracker', {
      body: data.body || 'Your bus is approaching!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'bus-alert',
      renotify: true,
      vibrate: [300, 100, 300, 100, 300],
      data: { url: data.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(event.notification.data?.url || '/dashboard');
    })
  );
});

self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body || 'Nova mensagem recebida no Xbot.',
        icon: payload.icon || '/icons/icon.svg',
        badge: payload.badge || '/icons/icon.svg',
        vibrate: [100, 50, 100],
        data: {
          url: payload.url || '/chat'
        }
      };

      event.waitUntil(
        self.registration.showNotification(payload.title || 'Xbot Notificação', options)
      );
    } catch (e) {
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification('Xbot Notificação', {
          body: text || 'Você tem uma nova mensagem de atendimento.',
          icon: '/icons/icon.svg',
          data: { url: '/chat' }
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/chat';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Procura se já existe uma janela aberta para este caminho e foca nela
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não houver, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

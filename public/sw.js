// Service Worker for Super League Kerala Push Notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Super League Kerala", body: event.data.text() };
  }

  const title = data.title || "Super League Kerala · Prediction Reminder";
  const options = {
    body: data.body || "Only 30 minutes left to submit your match prediction!",
    icon: data.icon || "/sbk-logo.png",
    badge: data.badge || "/sbk-logo.png",
    data: {
      url: data.url || "/",
    },
    tag: data.tag || "slk-prediction-reminder",
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ("focus" in client) {
          if (client.url.includes(targetUrl)) {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

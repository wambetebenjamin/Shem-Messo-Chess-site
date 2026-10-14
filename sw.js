self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));
self.addEventListener("push", (event) => {
  let data = {
    title: "Kericho Chess Academy",
    body: "There is a new academy update.",
    url: "/events",
  };
  try {
    Object.assign(data, event.data.json());
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/assets/favicon.png",
      data: { url: data.url },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.url || "/events",
    self.location.origin,
  );
  event.waitUntil(
    clients.openWindow(
      url.origin === self.location.origin ? url.href : "/events",
    ),
  );
});

// Kill-switch: unregister this service worker and clear all caches.
// A previous version cached '/' and other assets, causing stale HTML
// to persist even after deployments. This SW self-destructs on install.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((names) => Promise.all(names.map((n) => caches.delete(n))))
			.then(() => self.clients.matchAll())
			.then((clients) => {
				for (const client of clients) client.navigate(client.url);
				return self.registration.unregister();
			}),
	);
});

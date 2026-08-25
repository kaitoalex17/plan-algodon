self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener("fetch", (e) => {
  // Pass-through con captura de errores de red
  e.respondWith(
    fetch(e.request).catch((err) => {
      // Fallback silencioso en caso de cancelación o fallo de red
      return new Response("", { status: 408, statusText: "Request Timeout / Network Error" });
    })
  );
});

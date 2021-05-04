import { handleRequest } from './http_request';

declare const self: ServiceWorkerGlobalScope;

const DEBUG = true;

// Always install updated SW immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Intercept and proxy all fetch requests made by the browser or DOM on this scope.
self.addEventListener('fetch', (event: FetchEvent) => {
  try {
    event.respondWith(handleRequest(event.request))
  } catch (e) {
    console.error(e.message || e.toString());
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 501,
        }),
      )
    }
    event.respondWith(new Response('Internal Error', { status: 502 }));
  }
});

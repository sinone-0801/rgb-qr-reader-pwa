const CACHE_NAME = 'rgb-qr-reader-cache-v1';
const urlsToCache = [
  '/rgb-qr-reader-pwa/',
  '/rgb-qr-reader-pwa/index.html',
  '/rgb-qr-reader-pwa/style.css',
  '/rgb-qr-reader-pwa/script.js',
  '/rgb-qr-reader-pwa/manifest.json',
  'https://docs.opencv.org/4.x/opencv.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
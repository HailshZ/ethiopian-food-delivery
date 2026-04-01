// public/sw.js – Service Worker with cache-first strategy for static assets
// const CACHE_NAME = 'ethiofood-v1';
const CACHE_NAME = 'aradaw-v2';
const urlsToCache = [
  '/',
  '/menu',
  '/offline.html', // you'll create this file
  '/css/style.css',
  '/js/main.js',
  '/manifest.json'
];

// Install event – cache essential assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event – serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }
      return fetch(event.request).catch(() => {
        // If offline and request is for a page, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
// Service Worker para funcionamento Offline
const CACHE_NAME = 'kayla-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/js/config.js',
  '/js/utils.js',
  '/js/auth.js',
  '/js/register.js',
  '/js/clients.js',
  '/js/products.js',
  '/js/sales.js',
  '/js/orders.js',
  '/js/payments.js',
  '/js/devices.js',
  '/js/pdf.js',
  '/js/main.js',
  '/assets/icons/icon-192-dark.png',
  '/assets/icons/icon-512-dark.png'
];

// Install - Cache dos assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto:', CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[SW] Alguns assets falharam ao cachear:', err);
        return Promise.resolve();
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Servir do cache, fallback para rede
self.addEventListener('fetch', (event) => {
  // Ignorar requisições externas (Supabase, CDN, etc)
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Servir do cache
        return cachedResponse;
      }
      // Fallback para rede
      return fetch(event.request).catch(() => {
        // Se for navegação, retornar index.html offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker carregado');

// Service Worker para funcionamento Offline
const CACHE_NAME = 'kayla-v5.2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/app/index.html',
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

// Fetch - Estratégia Cache First, depois Network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // IGNORAR requisições POST, PUT, DELETE (APIs, Supabase, etc)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Para requisições da mesma origem (app local)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/app/index.html');
          }
        });
      })
    );
    return;
  }
  
  // Para requisições externas (CDN, Supabase) - tenta rede, fallback cache
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      // Se conseguiu, salva no cache (apenas GET)
      if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Falhou rede - tenta do cache
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Sem cache - retorna resposta vazia para APIs
        if (url.hostname.includes('supabase')) {
          return new Response(JSON.stringify({error: 'offline'}), {
            status: 503,
            headers: {'Content-Type': 'application/json'}
          });
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

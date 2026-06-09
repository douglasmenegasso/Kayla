// Service Worker para funcionamento Offline
const CACHE_NAME = 'kayla-v5.3';

// Lista básica de assets essenciais
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './js/config.js',
  './js/utils.js',
  './js/auth.js',
  './js/main.js',
  './assets/icons/icon-192-dark.png'
];

// Install - Cache dos assets
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache aberto:', CACHE_NAME);
      
      // Tenta cachear cada arquivo individualmente
      return Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
              console.log('[SW] Cacheado:', url);
            }
          } catch (err) {
            console.warn('[SW] Não encontrado (ignorando):', url, err);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Instalação completa');
      return self.skipWaiting();
    })
  );
});

// Activate - Limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker');
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
    }).then(() => {
      console.log('[SW] Ativação completa');
      return self.clients.claim();
    })
  );
});

// Fetch - Estratégia Network First, fallback Cache
self.addEventListener('fetch', (event) => {
  // IGNORAR requisições que não são GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Ignorar requisições externas (Supabase, analytics, etc)
  if (url.origin !== location.origin) {
    return;
  }
  
  event.respondWith(
    // Tenta rede primeiro
    fetch(event.request).then((networkResponse) => {
      // Se conseguiu, salva no cache
      if (networkResponse && networkResponse.status === 200) {
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
          console.log('[SW] Servindo do cache:', event.request.url);
          return cachedResponse;
        }
        
        // Se for navegação, retorna index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html').then((response) => {
            return response || caches.match('./app/index.html');
          });
        }
        
        // Retorna resposta vazia para outros casos
        return new Response('', { status: 404 });
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

// Service worker do Ache seu Livro: guarda os arquivos do site para abrir mesmo sem internet.
// Sempre tenta a internet primeiro (pra nunca mostrar versão velha) e usa o que está guardado só se falhar.
const CACHE_NAME = 'ache-seu-livro-v2';
const APP_FILES = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'books-data.js',
  'manifest.webmanifest',
  'assets/sem-capa.svg',
  'assets/icon-192.png',
  'assets/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isOwnFile = url.origin === self.location.origin;
  // Bibliotecas de fora (gráfico, QR code, ícones) também ficam guardadas para uso offline.
  // As capas não: são centenas de imagens e lotariam o armazenamento do celular.
  const isCachedExternal = /(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)$/.test(url.hostname);
  if (!isOwnFile && !isCachedExternal) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: isOwnFile }))
  );
});

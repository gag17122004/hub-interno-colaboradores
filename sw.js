'use strict';

const CACHE_VERSION = 'v3';
const CACHE_NAME    = `hub-pratik-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './core.js',
  './meu-espaco.js',
  './m1-horas.js',
  './m2-custos.js',
  './m3-precificacao.js',
  './m4-m5.js',
  './m6-auditoria.js',
  './m7-producao.js',
  './manifest.json',
  './icon.svg',
];

/* ── Instalação: pré-cache de assets estáticos (NÃO incluí index.html) ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Ativação: remove caches antigos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:') return;

  const isLocal = url.origin === self.location.origin;
  const isHTML  = url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isLocal && isHTML) {
    /* Network-first para HTML: sempre busca versão atualizada */
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else if (isLocal) {
    /* Cache-first para JS/CSS/imagens: retorna cache imediato, atualiza em segundo plano */
    event.respondWith(
      caches.match(request).then(cached => {
        const network = fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => null);
        return cached || network;
      })
    );
  } else {
    /* Network-first para CDN (FontAwesome, Google Fonts, Firebase) */
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});

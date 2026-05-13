'use strict';

const CACHE_VERSION = 'v1';
const CACHE_NAME    = `hub-pratik-${CACHE_VERSION}`;

const LOCAL_ASSETS = [
  './',
  './index.html',
  './app.css',
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

/* ── Instalação: pré-cache de ativos locais ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(LOCAL_ASSETS))
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

/* ── Fetch: cache-first local, network-first CDN ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:') return;

  const isLocal = url.origin === self.location.origin;

  if (isLocal) {
    /* Cache-first: retorna do cache imediatamente, atualiza em segundo plano */
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
    /* Network-first para CDN (FontAwesome, Google Fonts, SheetJS) */
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

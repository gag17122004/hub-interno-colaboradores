'use strict';

const CACHE_VERSION = 'v11';
const CACHE_NAME    = `hub-pratik-${CACHE_VERSION}`;

/* Assets pré-cacheados na instalação (fallback offline) */
const STATIC_ASSETS = [
  './core.js',
  './firebase-config.js',
  './meu-espaco.js',
  './m1-horas.js',
  './m2-custos.js',
  './m3-precificacao.js',
  './m4-m5.js',
  './m6-auditoria.js',
  './m7-producao.js',
  './m8-orcamentos.js',
  './m9-rendimento.js',
  './m10-manutencao.js',
  './m11-disputas.js',
  './m12-titulos.js',
  './m13-m20.js',
  './colaboradores.js',
  './manifest.json',
  './icon.svg',
];

/* ── Instalação ── */
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

/* ── Fetch: Network-first para tudo (sempre código atualizado) ──
   Fallback para cache apenas se offline.                         */
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol === 'chrome-extension:') return;

  /* Ignora requests externos que não devem ser cacheados */
  const isCacheable = url.origin === self.location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com');

  if (!isCacheable) return; /* Firebase SDK, Analytics — sem cache */

  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          /* Clona ANTES de usar — body só pode ser lido uma vez */
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

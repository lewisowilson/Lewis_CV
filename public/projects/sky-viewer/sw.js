// Sky Viewer service worker (PRD 10.1, M8). Hand-written, no build step.
// Strategies:
//   app pages        network first, fall back to cache (so updates arrive, offline still works)
//   /_next/static/*  cache first (file names are content hashed)
//   /data/*          cache first, refreshed in the background (catalogue bundles)
//   everything else  network, falling back to cache
// The page can post {type: "precache", urls: [...]} to fetch and keep pages plus the
// scripts and styles they reference (used by the dark-site download flow).
const VERSION = "sv-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const DATA = `${VERSION}-data`;

// The path the worker was registered under: "" at the root, "/projects/sky-viewer" on
// lewis-wilson.com. That build is a static export where every page is a folder, so page URLs
// there end in a slash.
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const page = (p) => (BASE ? BASE + (p.endsWith("/") ? p : `${p}/`) : p);
const asset = (p) => BASE + p;
// BASE is only letters, digits, hyphens and slashes, so it is safe inside a pattern as is.
const ASSET_RE = new RegExp(`(?:src|href)="(${BASE}/_next/static/[^"]+)"`, "g");

const SHELL_URLS = [
  ...["/", "/tonight", "/sky", "/conditions", "/log", "/settings", "/locations", "/kit", "/about", "/welcome"].map(page),
  asset("/manifest.webmanifest"),
  asset("/icons/icon.svg"),
];
const DATA_URLS = ["/data/stars-bright.json", "/data/star-names.json", "/data/constellations.json", "/data/dso.json"].map(asset);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await Promise.all(SHELL_URLS.map((u) => precacheWithAssets(shell, u).catch(() => undefined)));
      const data = await caches.open(DATA);
      await data.addAll(DATA_URLS).catch(() => undefined);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("sv-") && !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

async function precacheWithAssets(cache, url) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return 0;
  const copy = res.clone();
  await cache.put(url, res);
  let bytes = 0;
  const type = copy.headers.get("content-type") || "";
  if (type.includes("text/html")) {
    const html = await copy.text();
    bytes += html.length;
    const assets = [...html.matchAll(ASSET_RE)].map((m) => m[1]);
    const runtime = await caches.open(RUNTIME);
    await Promise.all(
      [...new Set(assets)].map(async (a) => {
        if (await runtime.match(a)) return;
        const r = await fetch(a).catch(() => null);
        if (r && r.ok) await runtime.put(a, r);
      }),
    );
  }
  return bytes;
}

self.addEventListener("message", (event) => {
  const msg = event.data || {};
  if (msg.type === "precache" && Array.isArray(msg.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL);
        let done = 0;
        for (const u of msg.urls) {
          await precacheWithAssets(cache, u).catch(() => undefined);
          done++;
          if (event.source) event.source.postMessage({ type: "precache-progress", done, total: msg.urls.length });
        }
        if (event.source) event.source.postMessage({ type: "precache-done", total: msg.urls.length });
      })(),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(asset("/_next/static/"))) {
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }
  if (url.pathname.startsWith(asset("/data/"))) {
    event.respondWith(staleWhileRevalidate(req, DATA));
    return;
  }
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, SHELL, true));
    return;
  }
  event.respondWith(networkFirst(req, RUNTIME, false));
});

async function cacheFirst(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const update = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await update) || new Response("offline", { status: 503 });
}

async function networkFirst(req, name, isPage) {
  const cache = await caches.open(name);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    if (isPage) {
      const shell = (await cache.match(page("/tonight"))) || (await cache.match(page("/")));
      if (shell) return shell;
    }
    return new Response("You are offline and this page has not been saved yet.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

// Clear-sky alerts (M10). The nightly job sends {title, body, url}.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Tonight looks good";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: asset("/icons/icon-192.png"),
      badge: asset("/icons/icon-192.png"),
      tag: "tonight",
      data: { url: data.url || page("/tonight") },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || page("/tonight");
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

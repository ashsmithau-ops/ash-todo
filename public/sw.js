// ─── Ash To Do — Service Worker ──────────────────────────────────────────────
// Caches the app shell so it loads offline, and queues Supabase writes
// so they sync automatically when the network comes back.

const CACHE = "ash-todo-v1";

// Files that make up the app shell — cached on first visit
const SHELL = ["/", "/index.html"];

// ── Install: cache the shell ──────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve from cache when offline ─────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always go network-first for Supabase API calls
  if (url.hostname.includes("supabase.co")) {
    e.respondWith(
      fetch(e.request).catch(() => {
        // If offline and it's a mutating request, queue it
        if (["POST","PATCH","DELETE"].includes(e.request.method)) {
          queueRequest(e.request.clone());
        }
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }

  // For everything else: try network, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── Offline queue (stored in IndexedDB) ──────────────────────────────────────
const DB_NAME = "ash-todo-queue";
const DB_STORE = "requests";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueRequest(request) {
  const db = await openDB();
  const body = await request.text();
  const tx = db.transaction(DB_STORE, "readwrite");
  tx.objectStore(DB_STORE).add({
    url: request.url,
    method: request.method,
    headers: [...request.headers.entries()],
    body,
    timestamp: Date.now(),
  });
}

async function flushQueue() {
  const db = await openDB();
  const tx = db.transaction(DB_STORE, "readwrite");
  const store = tx.objectStore(DB_STORE);
  const all = await new Promise((res) => {
    const req = store.getAll();
    req.onsuccess = () => res(req.result);
  });
  const keys = await new Promise((res) => {
    const req = store.getAllKeys();
    req.onsuccess = () => res(req.result);
  });

  for (let i = 0; i < all.length; i++) {
    const item = all[i];
    try {
      await fetch(item.url, {
        method: item.method,
        headers: Object.fromEntries(item.headers),
        body: item.body,
      });
      store.delete(keys[i]);
    } catch {
      // Still offline — leave in queue
    }
  }
}

// ── Sync queued requests when back online ─────────────────────────────────────
self.addEventListener("sync", (e) => {
  if (e.tag === "ash-todo-sync") e.waitUntil(flushQueue());
});

// Also flush when the service worker receives a message from the app
self.addEventListener("message", (e) => {
  if (e.data === "flush") flushQueue();
});

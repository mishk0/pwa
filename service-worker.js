'use strict';

const CACHE_NAME = 'v1';
const API_URL = 'https://api.fixer.io';

const filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css',
];

const API_TIMEOUT = 5000;

self.addEventListener('install', function(e) {
    e.waitUntil(
        self.skipWaiting(),
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(deleteObsoleteAssets());
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request, API_TIMEOUT));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req, timeout) {
    // Promise, срабатывает, если прошло API_TIMEOUT миллисекунд
    const timeoutPromise = new Promise((resolve, reject) => {
        let wait = setTimeout(() => {
            clearTimeout(wait);
            reject('TIME OVER')
        }, timeout);
    });

    // Задаем заголовки для фетча, чтобы ответ не кэшировался
    let myHeaders = new Headers();
    myHeaders.append('pragma', 'no-cache');
    myHeaders.append('cache-control', 'no-cache');
    const myInit = {
        method: 'GET',
        headers: myHeaders,
    };

    // Устраиваем гонку двух промайсов, какой быстрее завершится, тот и молодец
    const race = Promise.race([
        timeoutPromise,
        fetch(req, myInit),
    ]);

    // Обрабатываем первый завершившийся промайс, если resolve - берем ответ из сети, если reject - из кэша
    return race.then((response) => {
        return caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(req, response.clone());
                    })
                    .then(() => response);
    }, error => {
        console.error('[ServiceWorker] Fetch error:', error);
        return caches.match(req);
    });
}

function cacheFirst(req) {
    return caches.match(req).then(function(cache) {
        if (cache) {
            return cache;
        }

        return caches.open(CACHE_NAME).then(cache => {
            return fetch(req).then(function(res) {
                cache.put(req, res.clone());
                return res;
            });
        });
    })
}

function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}

function deleteObsoleteAssets() {
    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    })
}


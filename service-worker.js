'use strict';

const CACHE_VER = 'v1.1';
const reqRub = 'https://api.fixer.io/latest?base=RUB';
var API_URL = 'https://api.fixer.io';

const CURRENT_CACHES = {
    bundle: 'bundle',
    core: 'core-' + CACHE_VER
};
// bundle - файлы, которые будет выплевывать сборщик
// core - файлы со статичными именами, обновляются при изменении версии Service Worker'а

const bundelFiles = [
    './assets/app.js',
    './assets/styles.css'
];
const coreFiles = [
    './',
    './index.html'
]

self.addEventListener('install', function(e) {
    console.log('[sw]: install')
    e.waitUntil(
        self.skipWaiting(),
        caches.open(CURRENT_CACHES.core).then(function(cache) {
            return cache.addAll(coreFiles);
        }),
        addFilesToBundleCache(), 
        removeFilesFromBundleCache()
    );
});

self.addEventListener('activate', function(e) {
    console.log('[sw]: activate')
    self.clients.claim();
    e.waitUntil(
        deleteObsoleteAssets()
    );
});

self.addEventListener('fetch', function(e) {
    console.log('[sw]: fetch')
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request), 5000);
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function fetchCurrency() {
    return fetch(reqRub)
            .then(res => {
                return res;
            })
}

self.addEventListener('sync', event => {
    if (event.tag == 'sync-getCurrency') {
        event.waitUntil(
            fetchCurrency()
            .then(res => {
                caches
                    .open(CURRENT_CACHES.core)
                    .then(cache => {
                        console.log('Cache was updated after offline')
                        cache.put(reqRub, res.clone());
                    })
                self.registration.showNotification('Обновился курс валюты!')
            })
            .catch(err => {
                console.log('Error syncing currency')
            })
        );
    }
});

function networkFirst(req, timeout) {
    console.log('Network first');

    const fetchHeaders = new Headers();
    fetchHeaders.append('pragma', 'no-cache');
    fetchHeaders.append('cache-control', 'no-cache');
    const fetchParams = { method: 'GET', headers: fetchHeaders};
    const timerPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
            reject('timeout');
        }, timeout || 300);
    })
    return Promise.race([ fetch(req, fetchParams), timerPromise ])
        .then(res => {
            return caches
                .open(CURRENT_CACHES.core)
                .then(cache => { cache.put(req, res.clone()); })
                .then(() => {
                    return res;
                })
        })
        .catch(err => { return cacheFirst(req) })
}

function cacheFirst(req) {
    console.log("Cache first")
    return caches.match(req).then(cache => {
        if (cache) {
            return cache;
        }

        return caches.open(CURRENT_CACHES.core).then(cache => {
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
    console.log('update Core')
    return caches.keys().then((cacheNames) => {
        return Promise.all(
            // обновляем Core Cache
            cacheNames.map((cacheName) => {
                if (cacheName !== CURRENT_CACHES.core && cacheName.indexOf('core') !== -1) {
                    return caches.delete(cacheName);
                }
            })
        );
    })
}

/**
 * Добавляем файлы в кэш bundeles, если их там нет
 */
function addFilesToBundleCache() {
    console.log('add new bundles')
    bundelFiles.forEach(file => {
        caches.match(file).then(res => {
            if (!res) {
                caches.open(CURRENT_CACHES.bundle).then(cache => {
                    cache.add(file);
                })
            }
        })
    })
}
/**
 * Удаляем файлы из кэша bundeles, если их нет в списке файлов на кэширования
 */
function removeFilesFromBundleCache() {
    console.log('remove bundles')
    caches.open(CURRENT_CACHES.bundle).then(cache => {
        cache.keys().then(requests => {
            Promise.all(
                requests.map(req => {
                    let isNeed = false;
                    bundelFiles.forEach(file => {
                        if (req.url.indexOf(file.substr(1)) !== -1 && file.substr(1) != '/') {
                            isNeed = true;
                        }
                    })
                    if (!isNeed) {
                        cache.delete(req)
                    }
                })
            )
        })
    })
}
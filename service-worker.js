'use strict';

const CACHE_NAME = 'v1';
var API_URL = 'https://api.fixer.io';
var FETCH_TIMEOUT = 300;

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        self.skipWaiting(),
        caches.open(CACHE_NAME).then(function(cache) {
            // добавляем в кеш только новые файлы
            return Promise.all(
                filesToCache.map(function(file) {
                    return caches.match(file)
                        .then((res) => {
                            if (res === undefined) {
                                cache.add(file);
                            }
                        });
                })
            );
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();
    e.waitUntil(deleteObsoleteAssets());
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req) {
    return caches.open(CACHE_NAME).then(function(cache) {
        return fromNetworkWithTimeout(req, FETCH_TIMEOUT)
            .then(function(res) {
                cache.put(req, res.clone());
                return res;
            })
            .catch(err => {
                console.log('Error on networkFirst', err);
                return caches.match(req);
            });
    })
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

function fromNetworkWithTimeout(req, timeout) {
    return new Promise(function (fulfill, reject) {
        var timerId = setTimeout(reject, timeout);

        fetch(req).then(function(res) {
            clearTimeout(timerId);
            fulfill(res);
        }, reject);
    });
}

function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}

function deleteObsoleteAssets() {
    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            } else {
                // удаляем в текущем кеше то, что отсутствует в списке filesToCache
                return deleteObsoleteInCurrentCache();
            }
        }));
    })
}

function deleteObsoleteInCurrentCache() {
    return caches.open(CACHE_NAME)
        .then(function(cache) {
            return cache.keys()
                .then(function(keys) {
                    return Promise.all(keys.map(function(req) {
                        if (isApiCall(req.url)) {
                            return;
                        }

                        var url = new URL(req.url);
                        var path = '.' + url.pathname;

                        if (filesToCache.indexOf(path) === -1) {
                            return cache.delete(req);
                        }
                    }));
                });
        });
}

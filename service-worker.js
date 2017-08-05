'use strict';

const CACHE_NAME = 'v1';
const SEC_TIMEOUT = 5;
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        self.skipWaiting(),
        addNewAssets(filesToCache)
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(deleteObsoleteAssets(filesToCache));
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirstWithTimeout(e.request, SEC_TIMEOUT * 1000));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req) {
    return caches.open(CACHE_NAME).then(function(cache) {
        return fetch(req).then(function(res){
            cache.put(req, res.clone());
            return res;
        }).catch(err => {
            console.log('Error on networkFirst', err);

            return caches.match(req);
        });
    })
}

function networkFirstWithTimeout(req, timeout) {
    let fetchRpomise = caches.open(CACHE_NAME).then(function(cache) {
        return fetch(req).then(function(res){
            cache.put(req, res.clone());
            return res;
        });
    });

    let fallBackPromise = new Promise(function(resolve, reject) {
        return caches.match(req).then(function(cache) {
            setTimeout(function() {
                if (cache) {
                    resolve(cache);
                }
            }, timeout);
        })
    });

    return Promise.race([fetchRpomise, fallBackPromise]).then(function(res) {
        return res;
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

function addNewAssets(assets) {
    return caches.open(CACHE_NAME).then(function(cache) {
        return Promise.all(
            assets.map((asset) => {
                return cache.match(asset).then((matched) => {
                    if (!matched) {
                        return cache.add(asset);
                    }
                });
            })
        );
    });
}

function deleteObsoleteAssets(assets) {
    const origin = location.origin;
    const absoluteAssets = assets.map((asset) => {
        return asset.replace(/^\./, origin);
    });
    const obsoleteAssets = [];

    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    })
    .then(() => {
        return caches.open(CACHE_NAME).then(function(cache) {
            return cache.keys().then((keys) => {
                keys.forEach((key) => {
                    for (let i = 0; i < absoluteAssets.length; i++) {
                        if (key.url === absoluteAssets[i]) {
                            return;
                        }

                        if ( i === absoluteAssets.length - 1) {
                            obsoleteAssets.push(
                                cache.delete(key)
                            );
                        }
                    }
                });
            })
            .then(() => {
                return Promise.all(obsoleteAssets);
            })
            .catch((error) => {
                console.error('error while deleteObsoleteAssets', error)
            })
        });
    })
}

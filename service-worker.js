'use strict';

const CACHE_NAME = 'v1';
const SEC_TIMEOUT = 5;
const API_URL = 'https://api.fixer.io';
const ORIGIN = location.origin;

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        self.skipWaiting(),
        addNewAssets(filesToCache)
    );
});

self.addEventListener('activate', (e) => {
    self.clients.claim();

    e.waitUntil(deleteObsoleteAssets(filesToCache));
});

self.addEventListener('fetch', (e) => {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirstWithTimeout(e.request, SEC_TIMEOUT * 1000));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

self.addEventListener('sync', (e) => {
    if (e.tag === 'updateCurrencyCache') {
        const req = API_URL + '/latest?base=RUB';

        e.waitUntil(
            fetch(req).then((res) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(req, res);
                })
            })
            .then(() => {
                self.registration.showNotification('Currency cache updated');
            })
            .catch((err) => {
                console.log(`Sync failed: ${err}`);
            })
        );
    }
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    e.waitUntil(
        self.clients.openWindow(ORIGIN)
    );
});

function networkFirst(req) {
    return caches.open(CACHE_NAME).then((cache) => {
        return fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
        }).catch((err) => {
            console.log('Error on networkFirst', err);

            return caches.match(req);
        });
    })
}

function networkFirstWithTimeout(req, timeout) {
    let fetchRpomise = caches.open(CACHE_NAME).then((cache) => {
        return fetch(req).then((res) => {
            cache.put(req, res.clone());
            return res;
        });
    });

    let fallBackPromise = new Promise((resolve, reject) => {
        return caches.match(req).then((cache) => {
            setTimeout(() => {
                if (cache) {
                    resolve(cache);
                }
            }, timeout);
        })
    });

    return Promise.race([fetchRpomise, fallBackPromise]).then((res) => {
        return res;
    });
}

function cacheFirst(req) {
    return caches.match(req).then((cache) => {
        if (cache) {
            return cache;
        }

        return caches.open(CACHE_NAME).then(cache => {
            return fetch(req).then((res) => {
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
    return caches.open(CACHE_NAME).then((cache) => {
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
    const absoluteAssets = assets.map((asset) => {
        return asset.replace(/^\./, ORIGIN);
    });
    const obsoleteAssets = [];

    return caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    })
    .then(() => {
        return caches.open(CACHE_NAME).then((cache) => {
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

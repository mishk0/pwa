'use strict';

const CACHE_NAME = 'v1';
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', e => {

    const promise = caches.open(CACHE_NAME)
        .then(cache => cache.addAll(filesToCache))
        .then(() => self.skipWaiting())
        .then(() => console.log('>> installed'));

    e.waitUntil(promise);

});

self.addEventListener('activate', e => {

    const promise = deleteObsoleteAssets()
        .then(() => self.clients.claim())
        .then(() => console.log('>> activated'));

    e.waitUntil(promise);

});

self.addEventListener('fetch', e => {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req) {
    return caches.open(CACHE_NAME).then(cache => {
        return fetch(req).then(res => {
            cache.put(req, res.clone());
            return res;
        }).catch(err => {
            console.log('Error on networkFirst', err);

            return caches.match(req);
        });
    })
}

function cacheFirst(req) {
    return caches.match(req).then(cache => {
        if (cache) {
            return cache;
        }

        return caches.open(CACHE_NAME).then(cache => {
            return fetch(req).then(res => {
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
    return caches.keys().then(keys => {
        return Promise.all(keys.map(key => {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    })
}

'use strict';

const CACHE_NAME = 'v1';
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

//self.addEventListener('fetch', function(e) {
//    if (isApiCall(e.request.url)) {
//        e.respondWith(networkFirst(e.request));
//    } else {
//        e.respondWith(cacheFirst(e.request));
//    }
//});

function networkFirst(req) {
    return caches.open(CACHE_NAME).then(function(cache) {
        return fetch(req).then(function(res){
            cache.put(req.url, res.clone());
            return res;
        });
    })
}

function cacheFirst(req) {
    return caches.match(req).then(function(cache) {
        return cache || fetch(req);
    })
}

function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}


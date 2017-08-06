'use strict';

const CACHE_VER = 'v1';
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

var whiteList = [];

self.addEventListener('install', function(e) {
    e.waitUntil(
        self.skipWaiting(),
        caches.open(CACHE_VER).then(function(cache) {
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
        e.respondWith(networkFirst(e.request), 5000);
    } else {
        e.respondWith(cacheFirst(e.request));
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
                .open(CACHE_VER)
                .then(cache => { cache.put(req, res.clone()); })
                .then(() => { return res; })
        })
        .catch(err => { return cacheFirst(req) })
}

function cacheFirst(req) {
    console.log("Cache first")
    return caches.match(req).then(cache => {
        if (cache) {
            return cache;
        }

        return caches.open(CACHE_VER).then(cache => {
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
    
    // get all cache names
    return caches.keys().then((cacheNames) => {
        return Promise.all(
            // delete all items that are not the current one
            cacheNames.map((cacheName) => {
                if (cacheName !== CACHE_VER) {
                    return caches.delete(cacheName);
                }
            })
        );
    })
}

'use strict';

const CACHE_NAME = 'v1';
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css',
    './assets/bg.png'
];

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
        e.respondWith(networkFirst(e.request));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

// v1
//function networkFirst(req) {
//    return caches.open(CACHE_NAME).then(function(cache) {
//        return fetch(req).then(function(res){
//            cache.put(req, res.clone());
//            return res;
//        })
//    })
//}

// v1
//function cacheFirst(req) {
//    return caches.match(req).then(function(cache) {
//        return cache || fetch(req);
//    })
//}

//v2
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

//v2
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

//v1
function deleteObsoleteAssets() {
    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME) {
                return caches.delete(key);
            }
        }));
    })
}

// v2
//function cacheNewAssets(cacheName, assets) {
//    return caches.open(cacheName).then(cache => {
//        return cache.keys().then(requests => {
//            var cachedAssets = requests.map(getRequestUrl);
//            var newAssets = assets.filter(path => cachedAssets.indexOf(path) === -1);
//
//            return cache.addAll(newAssets);
//        })
//    })
//}

// v2
//function deleteObsoleteAssets(cacheName, assets) {
//    return Promise.all([
//        caches.keys()
//            .then(names => {
//                return Promise.all(
//                    names.filter(name => name !== cacheName)
//                        .map(name => caches.delete(name))
//                );
//            }),
//        caches.open(cacheName).then(cache => {
//            return cache.keys().then(requests => {
//                var cachedAssets = requests.map(getRequestUrl);
//                var oldAssets = cachedAssets.filter(path => assets.indexOf(path) === -1);
//
//                return Promise.all(oldAssets.map(asset => cache.delete(asset)));
//            })
//        })
//    ])
//}


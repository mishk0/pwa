'use strict';

const CACHE_NAME = 'v1';
const TIMEOUT = 2000;
var API_URL = 'https://api.fixer.io';

var filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css',
    './assets/9c0ceb22f3a74dbdb7bda7dc5410ce5b.js',
    './assets/47dc680c4f4919126628de4937800cd0.css'
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
        e.respondWith(networkFirst(e.request, TIMEOUT));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req, timeout) {
    return caches.open(CACHE_NAME).then(function(cache) {

      return new Promise((resolve) => {
        var timer = setTimeout(() => {
          resolve(caches.match(req));
        }, timeout);

        fetch(req)
          .then(res => {
            clearTimeout(timer);
            cache.put(req, res.clone());
            resolve(res);
          })
          .catch(err => {
            clearTimeout(timer);
            console.log('Error on networkFirst', err);
            resolve(caches.match(req));
          });
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

function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}

function deleteObsoleteAssets() {
    return caches.open(CACHE_NAME).then(function(cache) {
      cache.keys().then(function(keys) {
        keys.forEach(function(request, index, array) {
          let url = request.url.replace (/^[a-z]{4,}\:\/{2}[a-z]{1,}\:[0-9]{1,4}.(.*)/, './$1');
          if(!isApiCall(url)&&(filesToCache.indexOf(url) == -1))
          {
            cache.delete(request);
          }
        });
      });
    })
}

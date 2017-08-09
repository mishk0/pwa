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
        self.skipWaiting(),
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(deleteObsoleteAssets(filesToCache));
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request, 1500));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req, timeout) {
    return caches.open(CACHE_NAME)
        .then(function(cache) {
            // Функция отправляет запрос в сеть, а по истечению указанного timeout, фолбечится на кеш.
            let timer = setTimeout(() => {
                cacheFirst(req);
            }, timeout);

            return fetch(req).then(function(res) {
                cache.put(req, res.clone());

                clearTimeout(timer);

                return res;
            }).catch(err => {
                console.log('Error on networkFirst', err);

                return caches.match(req);
            });
        })
}

function cacheFirst(req) {
    return caches.open(CACHE_NAME).then(cache => {
        return cache.match(req).then(res => {
            if (res) {
                return res;
            }
            
            return fetch(req).then(function(res) {
                cache.put(req, res.clone());
                
                return res;
            })
            .catch(err => {
                console.log('Error on cacheFirst', err);
    
                return caches.match(req);
            });
        })
    });
}

function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}

function deleteObsoleteAssets(files) {
    return caches.open(CACHE_NAME).then(cache => {
        // если есть в кэше, но нет в массиве - удалить
        cache.keys().then(res => {
            return res.reduce((init, request) => {
                let clearURL = request.url.replace(`${location.origin}/`, './');

                files.indexOf(clearURL) < 0 && init.push(clearURL);

                return init;
            }, []);
        })
        .then(res => {
            return Promise.all(
                res.map(url => cache.delete(url))
            )
        })
        .then(res => {
            // если нет в кэше, но есть в массиве - добавить
            files.forEach(url => {
                cache.keys(url).then(res => {
                    if (res.length === 0) {
                        return cache.add(url);
                    }
                })
            });


            cache.keys().then(res => console.log(res));
            
        });
    })
}

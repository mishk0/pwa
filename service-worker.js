'use strict';

const CACHE_NAME = 'v1';
var API_URL = 'https://api.fixer.io';
const API_URL_BASE = API_URL + '/latest?base=RUB';

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

self.addEventListener('sync', event => {  
    if (event.tag === 'submit') {
        return caches.open(CACHE_NAME).then(cache => {
            return cache.keys(API_URL_BASE).then(keys => {
                if (keys.length > 0) {
                    return cache.delete(API_URL_BASE).then(res => {
                        return fetch(API_URL_BASE)
                            .then(() => self.registration.showNotification('Exchange rates', {
                                body: 'Currency rates updated'
                            }));
                    })
                }
            });
        });
    }
});

/**
 * 1. Реализовать в воркере networkFrist(request, timeout). 
 * 
 * @param {Request} req 
 * @param {number} timeout 
 * @returns 
 */
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
/**
 * 2. Сделать "умное" обновление кеша. 
 * 
 * @param {any} files 
 * @returns 
 */
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
                    if (res.length) {
                        return cache.add(url);
                    }
                })
            });
        });
    })
}

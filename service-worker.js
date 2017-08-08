'use strict';

const CACHE_NAME = 'v1';
const API_URL = 'https://api.fixer.io';
const DELAY = 300;
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
        e.respondWith(networkFirst(e.request, DELAY));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

function networkFirst(req, timeout) {

    // Запрос в сеть
    const networkRequest = new Promise( (resolve, reject) => {
        fetch(req).then(res => {
            console.log('Network', res);
            resolve(res);
        }).catch(err => {
            // Можно reject
            resolve('FETCH_ERROR');
        });
    });

    // Таймер
    const timer = new Promise( (resolve, reject) => {
        setTimeout(() => resolve('TIME_OUT'), timeout);
    });


    return Promise.race([networkRequest, timer]).then(res => {

        if (res === 'TIME_OUT' || res === 'FETCH_ERROR') {
            return caches.match(req).then(res => {
                if (res) {
                    return res;
                }
                // Если кэш пустой и плохое соединение
                // TODO: Создать бланковый ответ или повторить запрос с большим таймаутом
                return new Response();
            });

        } else {
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(req, res.clone());
            }).then(() => res);
        }

    });

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

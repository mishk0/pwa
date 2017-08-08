'use strict';

const CACHE_NAME = 'v1';
const CACHE_STATIC = 'static';
const API_URL = 'https://api.fixer.io';
const DELAY = 300;
const ORIGIN = location.origin;
const filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

self.addEventListener('install', e => {

    const promise = caches.open(CACHE_STATIC)
        .then(cache => updateCache(cache))
        .then(() => self.skipWaiting())
        .then(() => console.log('>> installed'));

    e.waitUntil(promise);

});

self.addEventListener('activate', e => {

    const promise = self.clients.claim()
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
        fetch(req)
            .then(res => resolve(res))
            .catch(err => resolve('FETCH_ERROR'));
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

// Обновляет кэш статики
function updateCache(cache) {

    cache.keys().then(keys => {
        let urlsToCache = convertUrls(filesToCache);
        let urlsAlreadyInCache = [];
        keys.map(item => urlsAlreadyInCache.push(item.url));

        let urlsToUpdate = manageAssets(urlsToCache, urlsAlreadyInCache);

        cache.addAll(urlsToUpdate.add)
            .then(() => {
                urlsToUpdate.del.map(item => cache.delete(item));
            });
    });

}

// Compare arrays and return object with assets to add / delete
function manageAssets(arrA, arrB) {
    let add = [],
        del = [];

    arrA.map(item => {
        if (!arrB.includes(item)) {
            add.push(item);
        }
    });

    arrB.map(item => {
        if (!arrA.includes(item)) {
            del.push(item);
        }
    })

    return {
        add,
        del
    }
}

// Convert URLs from relative to absolute
function convertUrls(array) {
    return array.map(item => ORIGIN + item.substr(1));
}

'use strict';

const CACHE_NAME = 'v1';
const FETCH_TIMEOUT = 300;
var API_URL = 'https://api.fixer.io';
var CURRENCY_URL = "";

var filesToCache = [
    './index.html',
    './assets/app.js',
    './assets/styles.css'
];

//для запросов к apiнельзя использовать кэш
var noCacheHeader = new Headers();
noCacheHeader.append('pragma', 'no-cache');
noCacheHeader.append('cache-control', 'no-cache');

var myInit = {
  method: 'GET',
  headers: noCacheHeader
};

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
        //записываем урл для курса
        CURRENCY_URL = e.request.url;
        e.respondWith(networkFirst(e.request));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

self.addEventListener('sync', function (e) {
    e.waitUntil(
        fetch(CURRENCY_URL, myInit)
            .then((res) => {
                caches.open(CACHE_NAME).then(function (cache) {
                    cache.put(CURRENCY_URL, res).then(function () {
                        console.log('Updated via sync: ' + CURRENCY_URL);
                        self.registration.showNotification('Exchange rates updated in background');
                    });
                })
            })
            .catch((err) => {
                self.registration.showNotification(err);
            })
    );
})

function networkFirst(req) {
    return caches.open(CACHE_NAME).then(function (cache) {

        return new Promise(function (resolve, reject) {

            var timeout = setTimeout(function () {
                //если самый первый запрос не пройдет таймаут, то ничего не загрузится, из-за того, что первому запросу из кэша нечего
                //взять, поэтому пока кэш пустой, нельзя использовать таймаут, т.е. дать возможность использовать максимальное время fetch
                caches.match(req).then((res)=>{
                    if (res) reject(new Error('Request timed out'));
                })
            }, FETCH_TIMEOUT);
            fetch(req, myInit)
                .then(function (res) {
                    clearTimeout(timeout);
                    resolve(res);
                })
                .catch(function (err) {
                    reject(err);
                });
        })
        .then(function(res){
            console.log('Loading from network...');
            cache.put(req, res.clone());
            return res;
        })
        .catch(function(err){
            console.warn('Error on network First:', err);
            return caches.match(req);
        })
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
    // return caches.keys().then(function(keys) {
    //     return Promise.all(keys.map(function(key) {
    //         if (key !== CACHE_NAME) {
    //             return caches.delete(key);
    //         }
    //     }));
    // })
    
    return caches.open(CACHE_NAME)
    .then(cache => cache.matchAll())
    .then((cache) => {
        cache.forEach(function(element) {
            var FOUND = false;
            filesToCache.forEach(function(file){
                if (element.url.match(file.substring(1)) && !element.url.match('index.html')){
                     FOUND = true;
                }
            })
            if (!FOUND){
                console.log('Deleting from cache: ' + element.url);
                caches.open(CACHE_NAME)
                .then(cache => cache.delete(element.url))
            }
        });
    })
}

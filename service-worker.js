'use strict';

const CACHE_NAME = 'v1';
const STATIC_NAME = 'static';
const NETWORK_FIRST_TIMEOUT = 5;
var API_URL = 'https://api.fixer.io';

var staticToCache = [
    './index.html',
    './assets/app.js',
    './assets/styles.css',
    './assets/refresh.svg',
    './assets/icons/icon152.png'
];

self.addEventListener('install', function(e) {
    e.waitUntil(
        self.skipWaiting(),
        caches.open(STATIC_NAME).then(function(cache) {
            return cache.addAll(staticToCache);
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(
        addNewAssets(),
        deleteObsoleteAssets(),
        deleteObsoleteCaches()
    );
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

self.addEventListener('sync', function(event) {
    if (event.tag === 'force-update-push') {
        event.waitUntil(updateCurrency().then(() => {
            self.registration.showNotification('Currency', {
                body: 'Currencies successfully updated',
                icon: './assets/icons/icon152.png'
            });
        }));
    } else if (event.tag === 'force-update') {
        event.waitUntil(updateCurrency());
    }
});

/**
 * Функция используется для обработки запросов к API. Сначала она
 * отправляет запрос в сеть, а по истечении таумаута (константа 
 * NETWORK_FIRST_TIMEOUT) берёт данные из кеша.
 */
function networkFirst(req) {
    var myHeaders = new Headers();
    myHeaders.append('pragma', 'no-cache');
    myHeaders.append('cache-control', 'no-cache');
    var myInit = {
        method: 'GET',
        headers: myHeaders,
    };

    const race = Promise.race([
        new Promise((resolve, reject) => {
            let wait = setTimeout(() => {
                clearTimeout(wait);
                reject();
            }, NETWORK_FIRST_TIMEOUT * 1000);
        }),
        fetch(req, myInit),
    ]);

    return race.then((res) => {
        return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, res.clone());
        }).then(() => res);
    }, error => {
        return caches.match(req);
    });
}

/**
 * Функция для работы с запросами на загрузку статики. Сначала пытается найти
 * статику в кеше, а в случае неудачи идёт в сеть.
 */
function cacheFirst(req) {
    return caches.match(req).then(function(cache) {
        if (cache) {
            return cache;
        }

        return caches.open(STATIC_NAME).then(cache => {
            return fetch(req).then(function(res) {
                cache.put(req, res.clone());
                return res;
            });
        });
    })
}

/**
 * Функция возвращает true, если ей был передан URL запроса к API.
 */
function isApiCall(url) {
    return url.indexOf(API_URL) !== -1;
}

/**
 * Функция удаляет неактуальные файлы из кеша статики.
 */
function deleteObsoleteAssets() {
    return caches.open(STATIC_NAME).then(cache => {
        return cache.keys().then(keys => {
            // Идём по всем закешированным файлам в кеше
            return Promise.all(keys.map(function(key) {
                // Имя текущего файла
                const filename = './' + key.url.split('/').slice(3).join('/');
                // Удаляем файл из кеша, если его больше нет в массиве staticToCache
                if (staticToCache.indexOf(filename) === -1) {
                    return cache.delete(key);
                }
            }))
        });
    });
}

/**
 * Функция добавляет новые файлы в кеш статики.
 */
function addNewAssets() {
    return caches.open(STATIC_NAME).then(cache => {
        staticToCache.forEach(file => {
            cache.match(file).then((res) => {
                if (!res) {
                    return cache.add(file);
                }
            });
        });
    });
}

/**
 * Функция удаляет кеши старых версий.
 */
function deleteObsoleteCaches() {
    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME && key !== STATIC_NAME) {
                return caches.delete(key);
            }
        }));
    })
}

function updateCurrency() {
    return fetch(API_URL + '/latest?base=RUB').then(res => {
        return caches.open(CACHE_NAME).then(cache => {
            return cache.put(res.url, res);
        })
    });
}

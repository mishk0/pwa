'use strict';

const CACHE_NAME = 'v3';
const ORIGIN = location.origin;
const API_URL = 'https://api.fixer.io';

const filesToCache = [
    './',
    './index.html',
    './assets/app.js',
    './assets/styles.css',

];

// Статические файлы для кэширования(создано два пустых файла для тестирования "3" и "4" на конце)
const staticsToCache = [
    './assets/9c0ceb22f3a74dbdb7bda7dc5410ce54.css',
];


const API_TIMEOUT = 5000;

self.addEventListener('install', function(e) {
    self.skipWaiting();

    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(filesToCache).then(() => updateStaticCache());
        })
    );
});

self.addEventListener('activate', function(e) {
    self.clients.claim();

    e.waitUntil(deleteObsoleteAssets());
});

self.addEventListener('fetch', function(e) {
    if (isApiCall(e.request.url)) {
        e.respondWith(networkFirst(e.request, API_TIMEOUT));
    } else {
        e.respondWith(cacheFirst(e.request));
    }
});

self.addEventListener('sync', function(event) {
    if (event.tag === 'updateCurrenciesInBackground') {
        event.waitUntil(updateCurrency().then(() => {
            self.registration.showNotification("Currencies successfully updated");
        }));
    }
});

function updateCurrency() {
    return fetch(API_URL + '/latest?base=RUB').then(res => {
        return caches.open(CACHE_NAME).then(cache => {
            return cache.put(res.url, res).then(() => true);
        })
    });
}

function networkFirst(req, timeout) {
    // Promise, срабатывает, если прошло API_TIMEOUT миллисекунд
    const timeoutPromise = new Promise((resolve, reject) => {
        let wait = setTimeout(() => {
            clearTimeout(wait);
            reject('TIME OVER')
        }, timeout);
    });

    // Задаем заголовки для фетча, чтобы ответ не кэшировался
    let myHeaders = new Headers();
    myHeaders.append('pragma', 'no-cache');
    myHeaders.append('cache-control', 'no-cache');
    const myInit = {
        method: 'GET',
        headers: myHeaders,
    };

    // Устраиваем гонку двух промайсов, какой быстрее завершится, тот и молодец
    const race = Promise.race([
        timeoutPromise,
        fetch(req, myInit),
    ]);

    // Обрабатываем первый завершившийся промайс, если resolve - берем ответ из сети, если reject - из кэша
    return race.then((response) => {
        return caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(req, response.clone());
                    })
                    .then(() => response);
    }, error => {
        console.error('[ServiceWorker] Fetch error:', error);
        return caches.match(req);
    });
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

// Кэшируем файлы в таблицы assets, если файла с таким хэшом еще нет
function addFilesToCache(cache) {
    return Promise.all(staticsToCache.map((fileName) => {
        return caches.match(fileName).then((res) => {
            if (res === undefined) {
                return cache.add(fileName)
            }
        });
    }))
}

// Удаляем файлы из таблицы assets, если хэш в названии файла не перечислен в списке файлов для кэширования
function removeFilesFromCache(cache) {
    return new Promise((resolve) => {
        cache.keys().then(function(keys) {
            keys.forEach(function(request) {
                const fileLocalUrl = '.' + request.url.substring(ORIGIN.length);
                if(staticsToCache.indexOf(fileLocalUrl) === -1) {
                    return cache.delete(request);
                }
            });
            resolve(true);
        });
    })
}

// Обновляем кэш в таблице assets
function updateStaticCache() {
    caches.open('assets').then(function(cache) {
        removeFilesFromCache(cache).then(() => addFilesToCache(cache));
    });
}


function deleteObsoleteAssets() {
    return caches.keys().then(function(keys) {
        return Promise.all(keys.map(function(key) {
            if (key !== CACHE_NAME && key !== 'assets') {
                return caches.delete(key);
            }
        }));
    })
}
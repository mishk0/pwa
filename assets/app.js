(function() {
    'use strict';

    const API_URL = 'https://api.fixer.io';
    const AUTO_UPDATE_SEC = 5;
    const CACHE_NAME = 'v1';

    const currenciesNode = document.querySelector('.currencies');
    const loaderNode = document.querySelector('.loader');
    const lastUpdateNode = document.querySelector('.last-update__date');
    const updateNode = document.querySelector('.update-bar__icon');
    
    let _lastData;

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);
    }

    function updateCurrency() {
        return getCurrency(true).then(data => {
            render(data);
            _lastData = data;
        });
    }

    function getCurrency(cacheFirst) {
        const req = API_URL + '/latest?base=RUB';

        return caches.open(CACHE_NAME).then(cache => cache.match(req))
            .then(cache => {
                if (cacheFirst && cache !== undefined) {
                    console.log('From cache');
                    return cache.json().then(data => processRates(data));
                } else {
                    console.log('From network');
                    return fetch(req)
                        .then(res => res.json())
                        .then(data => processRates(data));
                }
            });
    }

    function render(data) {
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
            res.rates[currency] = (1 / Math.random()).toFixed(3);
            return res;
        }, data);
    }

    function createTmpl(data) {
        return Object.keys(data).reduce((res, item) => {
            var additionClass = '';

            if (_lastData && _lastData.rates) {
                if (data[item] > _lastData.rates[item]) {
                    additionClass = 'currency__rate--up';
                } else if (data[item] < _lastData.rates[item]) {
                    additionClass = 'currency__rate--down';
                }
            }

            return res + `<div class="currency">
                <span class="currency__name">${item}</span>
                <span class="currency__rate ${additionClass}">${data[item]}</span>
            </div>`;
        }, '');
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js').then((registration) => {
                Notification.requestPermission().then((result) => {
                    if ('sync' in registration) {
                        if (result === 'granted') {
                            updateNode.addEventListener('click', () => {
                                registration.sync.register('force-update-push');
                            });
                        } else {
                            updateNode.addEventListener('click', () => {
                                registration.sync.register('force-update');
                            });
                        }
                    }
                });
            });
    }

    init();

})();

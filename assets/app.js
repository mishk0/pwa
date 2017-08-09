(function() {
    'use strict';
    var CACHE_NAME = 'v1';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 5;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var lastUpdateNode = document.querySelector('.lastUpdate_date');
    var _lastData;

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);
    }

    function updateCurrency() {
        return getCurrency().then(data => {
            render(data);
            _lastData = data;
        });
    }

    /**
     * 3. Улучшить клиентскую функцию getCurrency, которая изначально должна пытаться доставать данные из кеша 
     * 
     * @returns 
     */
    function getCurrency() {
        return window.caches.open(CACHE_NAME).then(cache => {
            return cache.match(API_URL + '/latest?base=RUB')
                .then(res => {
                    if (res) {
                        return res.json().then(data => processRates(data));
                    }

                    return fetch(API_URL + '/latest?base=RUB')
                        .then(res => res.json())
                        .then(data => processRates(data));
                })
        })
    }

    function render(data) {
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
                //res.rates[currency] = (1/res.rates[currency]).toFixed(2);
                res.rates[currency] = (1/Math.random()).toFixed(3);

                return res;
            }, data);
    }

    function createTmpl(data) {
        return Object.keys(data).reduce((res, item) => {
            var additionClass = '';

            if (_lastData && _lastData.rates) {
                if (data[item] > _lastData.rates[item]) {
                    additionClass = 'currency-rate_up';
                } else if (data[item] < _lastData.rates[item]) {
                    additionClass = 'currency-rate_down';
                }
            }

            return res + `<div class="currency">
                <span class="currency-name">${item}</span>
                <span class="currency-rate ${additionClass}">${data[item]}</span>
            </div>`;
        }, '');
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(() => { console.log('Service Worker Registered') });
    }

    init();
})();

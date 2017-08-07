(function() {
    'use strict';
    const API_URL = 'https://api.fixer.io';
    const AUTO_UPDATE_SEC = 5;
    const updateCurrenciesBtn = document.querySelector('.update-currencies');
    const currenciesNode = document.querySelector('.currencies');
    const loaderNode = document.querySelector('.loader');
    const lastUpdateNode = document.querySelector('.lastUpdate_date');
    let _lastData;
    const CACHE_NAME = 'v3';

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);

        updateCurrenciesBtn.addEventListener('click', () => {updateCurrency(true)})
    }

    function updateCurrency(fromNetwork = false) {
        return getCurrency(fromNetwork).then(data => {
            render(data);
            _lastData = data;
        });
    }

    function getCurrencyNetwork(url) {
        return fetch(url)
            .then(res => res.json())
            .then(data => processRates(data));
    }

    async function getCurrency(fromNetwork) {
        const url = API_URL + '/latest?base=RUB';
        if('caches' in window && fromNetwork === false) {
            const cache = await caches.open(CACHE_NAME);
            const res = await cache.match(url);
            if(res !== undefined){
                return res.json().then(data => processRates(data));
            } else {
                return getCurrencyNetwork(url);
            }
        } else {
            return getCurrencyNetwork(url);
        }
    }

    function render(data) {
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
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
            .register('./service-worker.js').then((req) => {
                Notification.requestPermission();
                if('sync' in req) {
                    updateCurrenciesBtn.addEventListener('click', () => {
                        req.sync.register('updateCurrenciesInBackground').then(() => {
                        });
                    });
                }
            });
    }

    init();
})();

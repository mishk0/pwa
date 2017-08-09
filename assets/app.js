(function() {
    'use strict';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 5;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var lastUpdateNode = document.querySelector('.lastUpdate_date');
    var _lastData;

    function init() {
        let refresh = document.querySelector('.refresh');
        refresh.addEventListener('click', getCurrencySync);

        updateCurrency(true);

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);
    }

    function updateCurrency(initial) {
        return getCurrency(initial).then(data => {
            render(data);
            _lastData = data;
        });
    }

    function getCurrency(initial = false) {
        const req = API_URL + '/latest?base=RUB';

        // Первый запрос при загрузке страницы
        if (initial) {
            return caches.match(req)
                .then(cache => {
                    // Если есть кэш, возвращаем cache
                    if (cache) return cache;
                    // Если кэша нет, возвращаем fetch
                    return fetch(req);
                })
                .then(res => res.json())
                .then(data => processRates(data));
        }
        // Все остальные запросы
        else {
            return fetch(req)
                .then(res => res.json())
                .then(data => processRates(data));
        }
    }

    function getCurrencySync() {
        // Если браузер поддерживает SW и пользователь оффлайн
        if ('serviceWorker' in navigator && !navigator.onLine ) {
            navigator.serviceWorker.ready.then( reg => reg.sync.register('update') );
        }
        // Не поддерживает SW или онлайн
        else {
            updateCurrency();
        }
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
            .then(() => {
                console.log('>> registered');
                if ('Notification' in window) { Notification.requestPermission() }
            });
    }

    init();
})();

(function () {
    'use strict';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 10;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var lastUpdateNode = document.querySelector('.lastUpdate_date');
    var updateButton = document.querySelector('.update-button');
    var _lastData;
    var UPDATE_COUNTER = 0;

    //для запросов к apiнельзя использовать кэш
    var noCacheHeader = new Headers();
    noCacheHeader.append('pragma', 'no-cache');
    noCacheHeader.append('cache-control', 'no-cache');

    var myInit = {
        method: 'GET',
        headers: noCacheHeader
    };

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

    function getCurrency() {
        return caches.match(API_URL + '/latest?base=RUB')
            .then(res => {
                if (UPDATE_COUNTER++) throw new Error('Not first update...')
                return res.json()
            })
            .then(data => {
                console.log('First request from cache');
                return processRates(data)
            })
            .catch(err => {
                console.log(err.message);
                return fetch(API_URL + '/latest?base=RUB', myInit)
                    .then(res => res.json())
                    .then(data => processRates(data));
            })
    }

    function render(data) {
        let time = new Date().toString().split(" ")[4];
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date + " " + time;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
            //res.rates[currency] = (1/res.rates[currency]).toFixed(2);
            res.rates[currency] = (1 / Math.random()).toFixed(3);

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
        
    updateButton.addEventListener('click', function () {
        updateCurrency();
        Notification.requestPermission()
            .then(function () {
                return navigator.serviceWorker.ready
                    .then(function (reg) {
                        return reg.sync.register('update in bg')
                            .then(function () {
                                console.log('Succesfully register sync event!')
                            })
                    })
            })
            .catch(function (err) {
                console.log(err);
            })
    })

    init();
})();

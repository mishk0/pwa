(function() {
    'use strict';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 5;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var lastUpdateNode = document.querySelector('.lastUpdate_date');
    const buttonUpdate = document.querySelector('.button-update');
    const headerText = document.querySelector('.header-title')
    const req = API_URL + '/latest?base=RUB';
    let firstLoad = true;
    var _lastData;
    // запрос разрешения на push
    Notification.requestPermission();

    buttonUpdate.addEventListener('click', function(){
        if (!isOnline()) {
            console.log("Offline mode")
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.sync.register('sync-getCurrency')
                    .then(res => { });
                }).catch(err => {
                    console.log('get Currency error:', err)
                })
            }
        }
        else {
            updateCurrency();
        }
    })

    function isOnline() {
        if (navigator.onLine) {
            headerText.innerHTML = 'Exchange rates';
            return true
        } else {
            headerText.innerHTML = 'Exchange rates: <span style="color: red;">Offline</span>';
            return false;
        }
    }

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);
    }
    /**
     * Обновить данные
     * @param {* ?Boolean} fromNetwork - обновить из сети?
     */
    function updateCurrency() {
        return getCurrency().then(data => {
            render(data);
            _lastData = data;
        });
    }

    function getCurrency() {
        return caches.match(req).then(res => {
            if ((firstLoad || !isOnline()) && res) {
                console.log("Get currency from cache. Online:", isOnline())
                return res.json().then(data => {
                    firstLoad = false;
                    return processRates(data)
                })
            } 
            else {
                console.log("Get currency from network. Online:", isOnline())
                return fetch(req)
                        .then(res => res.json())
                        .then(data => processRates(data));
            }
        })
    }

    function render(data) {
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
                res.rates[currency] = (1/res.rates[currency]).toFixed(2);
                // res.rates[currency] = (1/Math.random()).toFixed(3);

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

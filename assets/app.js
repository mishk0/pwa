(function() {
    'use strict';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 5;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var lastUpdateNode = document.querySelector('.lastUpdate_date');
    var _currencies;

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);
    }

    function getLastData() {
        if (!_currencies) {
            _currencies = localStorage._currencies && JSON.parse(localStorage._currencies);
        }

        return _currencies;
    }

    function updateData(data) {
        localStorage._currencies = JSON.stringify(data);
    }

    function updateCurrency() {
        return getCurrency().then(data => {
            render(data);
            updateData(data);
        });
    }

    function getCurrency() {
        return fetch(API_URL + '/latest?base=RUB')
            .then(res => res.json())
            .then(data => processRates(data));
    }

    function render(data) {
        currenciesNode.innerHTML = createTmpl(data.rates);
        lastUpdateNode.innerHTML = data.date;

        loaderNode.style.display = 'none';
    }

    function processRates(data) {
        return Object.keys(data.rates).reduce((res, currency) => {
                //res.rates[currency] = res.rates[currency].toFixed(3);
                res.rates[currency] = Math.random().toFixed(3);

                return res;
            }, data);
    }

    function createTmpl(data) {
        return Object.keys(data).reduce((res, item) => {
            var additionClass = '';
            var lastData = getLastData();

            if (lastData && lastData.rates) {
                if (data[item] > lastData.rates[item]) {
                    additionClass = 'currency-rate_up';
                } else if (data[item] < lastData.rates[item]) {
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

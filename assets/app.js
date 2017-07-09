(function() {
    'use strict';
    var API_URL = 'https://api.fixer.io';
    var AUTO_UPDATE_SEC = 5;
    var currenciesNode = document.querySelector('.currencies');
    var loaderNode = document.querySelector('.loader');
    var currencyRates = {};

    function init() {
        updateCurrency();

        setInterval(() => {
            updateCurrency();
        }, AUTO_UPDATE_SEC * 1000);

        bindEvents();
    }

    function bindEvents() {
        document.querySelector('.refresh').addEventListener('click', updateCurrency);
    }

    function updateCurrency() {
        return getCurrency().then(rates => render(rates));
    }

    function getCurrency() {
        return fetch(API_URL + '/latest')
            .then(res => res.json())
            .then(data => currencyRates = data.rates);
    }

    function render(rates) {
        currenciesNode.innerHTML = createTmpl(rates);

        loaderNode.style.display = 'none';
    }

    function createTmpl(data) {
        return Object.keys(data).reduce((res, item) => {
            var additionClass = '';

            if (data[item] > currencyRates[item]) {
                additionClass = 'currency-rate_up';
            } else if (data[item] < currencyRates[item]) {
                additionClass = 'currency-rate_down';
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

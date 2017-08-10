(function() {
    'use strict';
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

    function getCurrency() {
        return new Promise((resolve) => {
          let req = API_URL + '/latest?base=RUB';
          caches.match(req)
            .then(res => {
              if (res) {
                return res.json();
              }
              else
              {
                fetch(req)
                  .then(res => res.json())
                  .then(data => processRates(data))
                  .then(data => resolve(data));
              }
            })
            .then(data => {
              if(data) {
                resolve(processRates(data));
              }
            });
        });
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

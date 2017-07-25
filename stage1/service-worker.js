'use strict';

self.addEventListener('install', function(e) {
    console.log('sw installed');

    e.waitUntil(
        //self.skipWaiting()
    );
});

self.addEventListener('activate', function(e) {
    console.log('sw activated');
    //self.clients.claim();
});

self.addEventListener('fetch', function(e) {
    console.log(e.request.url);
});

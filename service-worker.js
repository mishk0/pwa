const version = 'v1'

addEventListener('install', (e) => {
   e.waitUntil(
       skipWaiting(),
       caches.open(version).then(cache => {
           cache.addAll(['./', './assets/app.js', './assets/styles.css'])
       })
   );
});

addEventListener('activate', (e) => {
    clients.claim();
    console.log('activate');

    e.waitUntil(caches.keys().then(keys => {
        return Promise.all(keys.filter(key => key !== version).map(key => caches.delete(key)))
    }))
});

addEventListener('fetch', (e) => {
   e.respondWith(
       caches.match(e.request).then(response => {
            if (response) {
                console.log('from cache', e.request.url);
                return response;
            }

            return caches.open(version).then(cache => {
                return fetch(e.request).then(response => {
                    if (response.status === 200) {
                        cache.put(e.request, response.clone());
                    }
                   return response;
                });
            });
       })
    )
});

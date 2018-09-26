if (typeof idb === "undefined") {
  self.importScripts('js/idb.js');
 }

 if (typeof DBHelper === "undefined") {
  self.importScripts('js/dbhelper.js');
 }
//augmented code to use keyval source: https://github.com/jakearchibald/idb-keyval
 //source: https://james-priest.github.io/mws-restaurant-stage-1/stage2.html
const staticCacheName = 'restaurant-static'; 

const dbPromise = idb.open('restaurant_info', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants');
  }
});

const dbPromiseReview = idb.open('restaurant_reviews', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('reviews');
  }
});

const dbPromiseOffline = idb.open('offline_reviews', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('offline');
  }
});

// IndexedDB object with get & set methods 
// https://github.com/jakearchibald/idb
const idbKeyVal = {
  get(key) {
    return dbPromise.then(db => {
      return db
        .transaction('restaurants')
        .objectStore('restaurants')
        .get(key);
    });
  },
  set(key, val) {
    return dbPromise.then(db => {
      const store = db.transaction('restaurants', 'readwrite');
      store.objectStore('restaurants').put(val, key);
      return store.complete;
    });
  }
};
const idbReviewKeyVal = {
  get(key) {
    return dbPromiseReview.then(db => {
      return db
        .transaction('reviews')
        .objectStore('reviews')
        .get(key);
    });
  },
  set(key, val) {
    return dbPromiseReview.then(db => {
      const store = db.transaction('reviews', 'readwrite');
      store.objectStore('reviews').put(val, key);
      return store.complete;
    });
  }
};

// list of assets to cache on install
// cache each restaurant detail page as well
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(staticCacheName)
      .then(cache => {
        return cache.addAll([
          '/',
          '/css/styles.css',
          '/css/responsive.css',
          '/index.html',
          '/restaurant.html',
          'js/main.js',
          'js/restaurant_info.js',
          '/registerSW.js',
          '/sw.js',
          'js/idb.js',
          'js/dbhelper.js',
          'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
          'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
          'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
          'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
          'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon-2x.png',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/13/2413/3080.jpg70?access_token=pk.eyJ1IjoiY2RhdmlzNCIsImEiOiJjamxpOHVvNnIwYjJnM3ByMjFwcW9jdjk5In0.WrX96W6zbl7Vo3Y8A2Vvfw',
          '/restaurant.html?id=1',
          '/restaurant.html?id=2',
          '/restaurant.html?id=3',
          '/restaurant.html?id=4',
          '/restaurant.html?id=5',
          '/restaurant.html?id=6',
          '/restaurant.html?id=7',
          '/restaurant.html?id=8',
          '/restaurant.html?id=9',
          '/restaurant.html?id=10',
          '/img/icon.png',
        ]).catch(error => {
          console.log('Caches open failed: ' + error);
        });
      })
  );
});

function idbResponse(request) {
  // 2. check idb & return match
  // 3. if no match then clone, save, & return response
  return idbKeyVal.get('restaurants') 
  .then(restaurants => {
    return (
       restaurants || fetch(request)
        .then(response => response.json())
        .then(json => {
          idbKeyVal.set('restaurants', json);
          return json;
        }) 
    );
  })
  .then(response => new Response(JSON.stringify(response)))
  .catch(error => {
    return new Response(error, {
      status: 404,
      statusText: 'bad restaurant request'
    });
  });
}
function idbReviewResponse(id,request) {
  // 2. check idb & return match
  // 3. if no match then clone, save, & return response
  return idbReviewKeyVal.get(id)
  .then(reviews => {
      return (
         reviews || fetch(request)
          .then(response => response.json())
          .then(json => {
           idbReviewKeyVal.set(id, json);
            return json;
          }) 
      );
    })
    .then(response => new Response(JSON.stringify(response)))
    .catch(error => {
      return new Response(error, {
        status: 404,
        statusText: 'bad review request'
      });
    });
  }

/**
 * combine create and add
 */
 //idb.open('restaurant_reviews', 1, upgradeDB => {
 // switch (upgradeDB.oldVersion) {
 //   case 0:
 //     upgradeDB.createObjectStore('reviews');
 // }
//});
function storeReviewLocal(reviewPromise){
  console.log("Store reviews in idb script is starting");
    reviewPromise
   .then(data =>{
    //open indexDB database and add data in this then
    idb.open('offline_reviews', 1, function(upgradeDB) {
      var store = upgradeDB.createObjectStore('offline',{ 
        autoIncrement: true, keyPath: 'id'
        });
        store.put('offline',data);
    }).then(registerSync => {
      return registeration.sync.register('offline');
  }).catch(error => {
    return new Response(error, {
      status: 404,
      statusText: 'offline storage failed'
    });
    });
  });
}

function cacheResponse(request) {
  // match request...
  return caches.match(request).then(response => {
    // return matched response OR if no match then
    // fetch, open cache, cache.put response.clone, return response
    return response || fetch(request).then(fetchResponse => {
      return caches.open(staticCacheName).then(cache => {
        // filter out browser-sync resources otherwise it will err
        if (!fetchResponse.url.includes('browser-sync')) { // prevent err
          cache.put(request, fetchResponse.clone()); // put clone in cache
        }
        return fetchResponse; // send original back to browser
      });
    });
  }).catch(error => {
    return new Response(error, {
      status: 404,
      statusText: 'Not connected to the internet'
    });
  });
}
/**
 * activate service worker
 */
self.addEventListener('activate', event => {
  event.waitUntil(
   //storeJSONLocal(),
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName.startsWith('restaurant-static') && cacheName !== staticCacheName;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

/**
 * fetch service worker
 */
self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  
  // 1. filter Ajax Requests
  if ((requestUrl.port === '1337')&& (event.request.url.endsWith('/restaurants'))) {
    event.respondWith(idbResponse(request));
  }
  if ((requestUrl.port == '1337') && (event.request.url.includes('/reviews/'))) {
    console.log(requestUrl),
    searchURL = new URL(requestUrl);
    var restaurantID = searchURL.searchParams.get("restaurant_id");
    console.log(restaurantID),
    event.respondWith(idbReviewResponse(restaurantID,request));
  }
  if(requestUrl.port !== '1337') {
    event.respondWith(cacheResponse(request));
  }
  if((request.method == 'POST') && (requestUrl.port == '1337')){
    event.respondWith(storeReviewLocal(DBHelper.postData()));
  }
});

function fetchReviewsIDB(){
  idb.open('offline_reviews', 1).then(function(db) {
   var tx = db.transaction(['offline'], 'readonly');
    var store = tx.objectStore('offline');
    return store.getAll()
    .then(items => {
    // Use restaurant review data
    }).catch(error => { console.error(error);
    });
  });
}


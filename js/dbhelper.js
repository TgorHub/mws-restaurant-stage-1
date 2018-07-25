/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/`;
  }

  static dbPromise() {
    return idb.open('mws-restaurant', 2, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          const reviewsStore = upgradeDb.createObjectStore('reviews', {
            keyPath: 'id'
          });
          reviewsStore.createIndex('restaurant', 'restaurant_id');
      }
    });
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return this.dbPromise()
    .then(db => {
      const tx = db.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.getAll();
    })
    .then(restaurants => {
      if(restaurants.length !== 0) {
        return Promise.resolve(restaurants);
      }
      return this.fetchAndCacheRestaurants();
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.find(r => r.id == id));
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.filter(r => r.cuisine_type == cuisine));
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.filter(r => r.neighborhood == neighborhood));
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return results;
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);

      return uniqueNeighborhoods;
    }).catch(error => console.error(error));
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
      return uniqueCuisines;
    }).catch(error => console.error(error));
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(restaurant.photograph) {
      return (`/img/${restaurant.photograph}.jpg`);
    }
    return ""
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

  static sendDataWhenOnline(offlineObj) {
    localStorage.setItem('data', JSON.stringify(offlineObj.data));

    window.addEventListener('online', (event) => {
      DBHelper.alertMessage("You are back online!", "green");
      let data = JSON.parse(localStorage.getItem('data'));
      if(data !== null) {
        if(offlineObj.name === 'addReview') {
          DBHelper.addReview(offlineObj.data);
        }

        localStorage.removeItem('data');
      }
    });
  }

  // alert message
  static alertMessage(message, bgColor) {
    const alertBox = document.getElementById('alert-box');
    alertBox.innerHTML = message;
    alertBox.style.display = 'block';
    alertBox.style.backgroundColor = bgColor;
    if(bgColor == 'green') {
      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 3000);
    }
  }

  /**
  * Get all restaurants and cache them
  */
  static fetchAndCacheRestaurants() {
    return fetch(`${DBHelper.DATABASE_URL}restaurants`).then(response => response.json())
    .then(restaurants => {
      return this.dbPromise()
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const restaurantStore = tx.objectStore('restaurants');
        restaurants.forEach(restaurant => restaurantStore.put(restaurant));
        return tx.complete.then(() => Promise.resolve(restaurants));
      });
    });
  }

  /**
  * Get stored object by id
  */
  static getStoredObjectById(table, idx, id) {
    return this.dbPromise()
    .then(function(db) {
      if(!db) return;

      const store = db.transaction(table).objectStore(table);
      const indexId = store.index(idx);
      return indexId.getAll(id);
    });
  }

  /**
  * Update favorite status
  */
  static updateFavoriteStatus(restaurantId, isFavorite) {
   console.log("changing status to: " , isFavorite);

   fetch(`http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${isFavorite}`, {
     method: 'PUT'
   })
   .then(() => {
     console.log("CHanged!");
     this.dbPromise()
     .then(db => {
       const tx = db.transaction('restaurants', 'readwrite');
       const restaurantsStore = tx.objectStore('restaurants');
       restaurantsStore.get(restaurantId)
       .then(restaurant => {
         restaurant.is_favorite = isFavorite;
         restaurantsStore.put(restaurant);
       });
     })
   })
  }
  /**
  * Get reviews
  */
  static fetchReviewsByRestId(id) {
    return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
    .then(response => response.json())
    .then(reviews => {
      this.dbPromise()
      .then(db => {
        if(!db) return;

        let tx = db.transaction('reviews', 'readwrite');
        const store = tx.objectStore('reviews');
        if(Array.isArray(reviews)) {
          reviews.forEach(function(review) {
            store.put(review);
          });
        } else {
          store.put(reviews);
        }
      });
      return Promise.resolve(reviews);
    })
    .catch(error => {
      return DBHelper.getStoredObjectById('reviews', 'restaurant', id)
      .then((storedReviews) => {
        return Promise.resolve(storedReviews);
      })
    });
  }

  static addReview(review) {
    let offlineObj = {
      name: 'addReview',
      data: review,
      object_type: 'review'
    };

    if(!navigator.onLine && (offlineObj.name === 'addReview')) {
      DBHelper.sendDataWhenOnline(offlineObj);
      return;
    }

    let reviewSend = {
      "name": review.name,
      "date": review.date,
      "rating": parseInt(review.rating),
      "comments": review.comments,
      "restaurant_id": parseInt(review.restaurant_id)
    }
    var fetch_options = {
      method: 'POST',
      body: JSON.stringify(reviewSend),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    };
    fetch(`http://localhost:1337/reviews`, fetch_options)
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if(contentType && contentType.indexOf('application/json') !== -1) {
        return response.json();
      } else {
        return 'API CALL SUCCESFUL!'
      }
    }).catch(error => console.log("error: " , error));
  }

}

let restaurant;
var map;

document.addEventListener('DOMContentLoaded', (event) => {
  window.addEventListener('offline', (event) => {
    DBHelper.alertMessage("Connection is down..", "red");
  });
});

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL()
  .then(restaurant => {
    self.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: restaurant.latlng,
      scrollwheel: false
    });
    fillBreadcrumb();
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
  })
  .catch(error => console.error(error));
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }
  const id = parseInt(getParameterByName('id'));
  if (!id) { // no id found in URL
    return Promise.reject('No restaurant id found in URL')
  } else {
    return DBHelper.fetchRestaurantById(id)
    .then(restaurant => {
      if (!restaurant) {
        return Promise.reject('No restaurant found')
      }
      self.restaurant = restaurant;
      fillRestaurantHTML();
      return restaurant;
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favoriteButton = document.getElementById('favorite-button');
  favoriteButton.onclick = function() {
    const isFavorite = !restaurant.is_favorite;
    console.log("CLICKECKKC: " , !restaurant.is_favorite);

    DBHelper.updateFavoriteStatus(restaurant.id, isFavorite);
    restaurant.is_favorite = isFavorite;
    changeFavButtonClass(favoriteButton, isFavorite);
  }
  changeFavButtonClass(favoriteButton, restaurant.is_favorite);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  DBHelper.fetchReviewsByRestId(restaurant.id)
  .then(reviews => fillReviewsHTML(reviews))
}

changeFavButtonClass = (el, fav) => {
  if(!fav) {
    console.log("is not favorite");
    el.classList.remove('favorite-true');
    el.classList.add('favorite-false');
    el.setAttribute('aria-label', 'Set as favorite');
  } else {
    console.log("IS FAVORITE!");
    el.classList.remove('favorite-false');
    el.classList.add('favorite-true');
    el.setAttribute('aria-label', 'Remove from favorites')
  }
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.id = "no-reviews"
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.setAttribute('role', 'group');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('role', 'article');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Handle form.
 */
 addReview = () => {
   event.preventDefault();
   let restaurantId = getParameterByName('id');
   let name = document.getElementById('username');
   let rating;
   let comments = document.getElementById('user-review').value;
   rating = document.querySelector('#stars input:checked').value;
   const review = [name, rating, comments, restaurantId];

   const frontEndReview = {
     restaurant_id: parseInt(review[3]),
     rating: parseInt(review[1]),
     name: review[0].value,
     comments: review[2].substring(0, 400),
     date: new Date()
   };

   DBHelper.addReview(frontEndReview);
   addReviewHTML(frontEndReview);
   document.getElementById('new-review-form').reset();
 }

 addReviewHTML = (review) => {
   if(document.getElementById('no-reviews')) {
     document.getElementById('no-reviews').remove();
   }
   const container = document.getElementById('reviews-container');
   const ul = document.getElementById('reviews-list');

   ul.insertBefore(createReviewHTML(review), ul.nextSibling);
   container.appendChild(ul);
 }

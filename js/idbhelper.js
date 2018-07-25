class IDBHelper {

  static dbPromise() {
    return idb.open('mws-restaurant', 2, function(upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDB.createObjectStore('restaurants', {
            keyPath: 'id'
          });
        case 1:
          upgradeDB.createObjectStore('reviews', {
            keyPath: 'id'
          });
          reviewsStore.createIndex('restaurant', 'restaurant_id');
      }
    });
  }

  const idbKeyval = {
    get(key) {
      return dbPromise.then(db => {
        return db.transaction('restaurants')
          .objectStore('restaurants').get(key);
      });
    },
    set(key, val) {
      return dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        tx.objectStore('restaurants').put(val, key);
        return tx.complete;
      });
    },
    delete(key) {
      return dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        tx.objectStore('restaurants').delete(key);
        return tx.complete;
      });
    },
    clear() {
      return dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        tx.objectStore('restaurants').clear();
        return tx.complete;
      });
    },
    keys() {
      return dbPromise.then(db => {
        const tx = db.transaction('restaurants');
        const keys = [];
        const store = tx.objectStore('restaurants');

        // This would be store.getAllKeys(), but it isn't supported by Edge or Safari.
        // openKeyCursor isn't supported by Safari, so we fall back
        (store.iterateKeyCursor || store.iterateCursor).call(store, cursor => {
          if (!cursor) return;
          keys.push(cursor.key);
          cursor.continue();
        });

        return tx.complete.then(() => keys);
      });
    },
    getAll() {
      return dbPromise.then(db => {
        return db.transaction('restaurants')
          .objectStore('restaurants').getAll();
      });
    }
  };
}

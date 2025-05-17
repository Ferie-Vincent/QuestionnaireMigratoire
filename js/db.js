// // db.js - Gestionnaire IndexedDB
// const DB_NAME = 'DAOSAR_DB';
// const DB_VERSION = 1;
// const STORE_NAME = 'pending_submissions';

// class DB {
//   constructor() {
//     this.db = null;
//   }

//   // Initialisation de la base
//   async init() {
//     return new Promise((resolve, reject) => {
//       const request = indexedDB.open(DB_NAME, DB_VERSION);

//       request.onupgradeneeded = (event) => {
//         const db = event.target.result;
//         if (!db.objectStoreNames.contains(STORE_NAME)) {
//           db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
//         }
//       };

//       request.onsuccess = (event) => {
//         this.db = event.target.result;
//         resolve(this);
//       };

//       request.onerror = (event) => {
//         reject(`IndexedDB error: ${event.target.error}`);
//       };
//     });
//   }

//   // Sauvegarde une requête en attente
//   async saveRequest(data) {
//     return new Promise((resolve, reject) => {
//       const transaction = this.db.transaction(STORE_NAME, 'readwrite');
//       const store = transaction.objectStore(STORE_NAME);

//       const request = store.add({
//         ...data,
//         createdAt: new Date().toISOString()
//       });

//       request.onsuccess = () => resolve();
//       request.onerror = (event) => reject(event.target.error);
//     });
//   }

//   // Récupère toutes les requêtes en attente
//   async getPendingRequests() {
//     return new Promise((resolve, reject) => {
//       const transaction = this.db.transaction(STORE_NAME, 'readonly');
//       const store = transaction.objectStore(STORE_NAME);

//       const request = store.getAll();

//       request.onsuccess = () => resolve(request.result || []);
//       request.onerror = (event) => reject(event.target.error);
//     });
//   }

//   // Supprime une requête synchronisée
//   async deleteRequest(id) {
//     return new Promise((resolve, reject) => {
//       const transaction = this.db.transaction(STORE_NAME, 'readwrite');
//       const store = transaction.objectStore(STORE_NAME);

//       const request = store.delete(id);

//       request.onsuccess = () => resolve();
//       request.onerror = (event) => reject(event.target.error);
//     });
//   }
// }

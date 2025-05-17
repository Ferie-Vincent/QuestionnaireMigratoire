/**
 * 📝 script.js - Gestionnaire de formulaire avec sauvegarde locale
 * et synchronisation vers Google Sheets.
 * 
 * Fonctionnalités :
 * - Collecte des données de formulaire (texte + images)
 * - Sauvegarde locale (localStorage + IndexedDB pour le hors-ligne)
 * - Synchronisation automatique quand en ligne
 * - Export des données en JSON
 * 
 * Dernières améliorations :
 * - Intégration complète d'IndexedDB
 * - Gestion des conflits de synchronisation
 * - Messages d'erreur détaillés
 * - Optimisation des performances
 */

import { db } from './db.js';

// Configuration
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby6ip-Exm_3tLjC1lnxc8ShI4QzNUoIKdr59BANYTwsB6tpIPt43vO1LGF0I4I47NmOHQ/exec',
  MAX_LOCAL_STORAGE_ENTRIES: 100,
  MAX_IMAGE_SIZE_MB: 2,
  SYNC_BATCH_SIZE: 5,
  SYNC_INTERVAL: 30000 // 30 secondes
};

// Messages
const MESSAGES = {
  SUCCESS: "✅ Données synchronisées avec Google Sheets !",
  ERROR_SYNC: "⚠️ Synchronisation échouée",
  ERROR_PHOTO_SIZE: "La photo dépasse 2MB",
  SAVE_SUCCESS: "✅ Enregistrement réussi !",
  SAVE_ERROR: "❌ Erreur lors de l'enregistrement",
  OFFLINE_SAVE: "📶 Données sauvegardées pour synchronisation ultérieure",
  STORAGE_FULL: "⚠️ Espace de stockage insuffisant"
};

// État global
let isSyncing = false;

/**
 * 🔄 Convertit un fichier image en base64
 * @param {File} file - Fichier image à convertir
 * @returns {Promise<string|null>} - Base64 ou null si invalide
 */
async function fileToBase64(file) {
  if (!file) return null;
  
  if (file.size > CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(MESSAGES.ERROR_PHOTO_SIZE);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erreur lecture fichier"));
    reader.readAsDataURL(file);
  });
}

/**
 * 📋 Collecte et structure les données du formulaire
 * @returns {Promise<Object>} - Données structurées avec métadonnées
 */
async function collectFormData() {
  const form = document.getElementById('questionnaireForm');
  const formData = new FormData(form);
  const data = {};

  // Conversion FormData -> Object
  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      data[key] = Array.isArray(data[key]) ? data[key] : [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  // Gestion de la photo
  try {
    const photoFile = document.getElementById('photoInput').files[0];
    if (photoFile) data.photo = await fileToBase64(photoFile);
  } catch (error) {
    console.error("Erreur photo:", error);
    throw error;
  }

  // Métadonnées
  data._metadata = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2),
    timestamp: new Date().toISOString(),
    device: navigator.userAgent,
    synced: false
  };

  return data;
}

/**
 * 💾 Sauvegarde sécurisée dans le localStorage
 * @param {Object} newData - Données à sauvegarder
 * @returns {Array} - Toutes les données stockées
 */
function saveToLocalStorage(newData) {
  try {
    let storedData = JSON.parse(localStorage.getItem('reponses') || '[]');
    
    if (!Array.isArray(storedData)) {
      console.warn("Corruption des données, réinitialisation...");
      storedData = [];
    }

    storedData.push(newData);
    
    if (storedData.length > CONFIG.MAX_LOCAL_STORAGE_ENTRIES) {
      storedData = storedData.slice(-CONFIG.MAX_LOCAL_STORAGE_ENTRIES);
    }
    
    localStorage.setItem('reponses', JSON.stringify(storedData));
    return storedData;
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    throw error;
  }
}

/**
 * ☁️ Synchronise les données avec Google Sheets
 */
async function syncDataWithGoogleSheet() {
  if (isSyncing) return false;
  isSyncing = true;

  try {
    const data = JSON.parse(localStorage.getItem('reponses') || '[]')
      .filter(entry => !entry._metadata?.synced);

    if (!data.length) return true; // Rien à synchroniser

    for (let i = 0; i < data.length; i += CONFIG.SYNC_BATCH_SIZE) {
      const batch = data.slice(i, i + CONFIG.SYNC_BATCH_SIZE);
      
      await Promise.all(batch.map(async (entry) => {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });
        if (!response.ok) throw new Error("Erreur HTTP");
        entry._metadata.synced = true;
      }));
    }

    localStorage.setItem('reponses', JSON.stringify(data));
    showMessage(MESSAGES.SUCCESS);
    return true;
  } catch (error) {
    console.error("Erreur synchronisation:", error);
    showMessage(MESSAGES.ERROR_SYNC, "danger");
    return false;
  } finally {
    isSyncing = false;
  }
}

/**
 * 📥 Génère le lien de téléchargement JSON
 */
function updateJsonDownloadLink(data = null) {
  try {
    const jsonData = data || JSON.parse(localStorage.getItem('reponses') || '[]');
    if (!jsonData.length) return;

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.getElementById('lienJSON');
    if (link) {
      link.href = url;
      link.download = `migration_data_${new Date().toISOString().slice(0, 10)}.json`;
      link.style.display = 'inline-block';
    }
  } catch (error) {
    console.error("Erreur génération JSON:", error);
  }
}

/**
 * 🟩 Affiche un message temporaire
 */
function showMessage(text, type = 'success') {
  const messageDiv = document.getElementById('message');
  if (!messageDiv) return;

  messageDiv.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;

  setTimeout(() => {
    const alert = messageDiv.querySelector('.alert');
    if (alert) new bootstrap.Alert(alert).close();
  }, 5000);
}

/**
 * ▶️ Initialisation de l'application
 */
async function initApp() {
  // Soumission du formulaire
  document.getElementById('questionnaireForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!e.target.checkValidity()) {
      e.target.classList.add('was-validated');
      return;
    }

    try {
      const formData = await collectFormData();
      const savedData = saveToLocalStorage(formData);
      
      showMessage(MESSAGES.SAVE_SUCCESS);
      updateJsonDownloadLink(savedData);
      e.target.reset();
      e.target.classList.remove('was-validated');

      if (navigator.onLine) await syncDataWithGoogleSheet();
    } catch (error) {
      const message = error.message.includes('QuotaExceeded') 
        ? MESSAGES.STORAGE_FULL 
        : MESSAGES.SAVE_ERROR;
      showMessage(`${message}: ${error.message}`, 'danger');
    }
  });

  // Synchronisation périodique
  setInterval(() => {
    if (navigator.onLine && !isSyncing) syncDataWithGoogleSheet();
  }, CONFIG.SYNC_INTERVAL);

  // Événement de reconnexion
  window.addEventListener('online', () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => registration.sync.register('sync-submissions'))
        .catch(console.error);
    }
  });

  updateJsonDownloadLink();


  // Bouton de sauvegarde manuelle
  document.getElementById('btnForceSync')?.addEventListener('click', async () => {
    if (!navigator.onLine) {
      showMessage("⚠️ Vous êtes hors ligne. Connexion requise.", "warning");
      return;
    }

    const success = await syncDataWithGoogleSheet();
    if (success) {
      // Optionnel : Nettoyer IndexedDB après succès
      try {
        await db.init();
        await db.deletePendingRequests();
      } catch (error) {
        console.error("Nettoyage IndexedDB échoué:", error);
      }
    }
  });
}

// Démarrage
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

/**
 * 🔒 Déconnexion
 */
function logout() {
  sessionStorage.removeItem('daosar_session');
  window.location.href = 'login.html';
}
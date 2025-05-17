/**
 * 📝 script.js - Gestionnaire de formulaire avec sauvegarde locale
 * et synchronisation vers Google Sheets.
 * 
 * Fonctionnalités :
 * - Collecte des données de formulaire (texte + images)
 * - Sauvegarde locale sécurisée (localStorage)
 * - Synchronisation automatique quand en ligne
 * - Export des données en JSON
 * 
 * Améliorations :
 * - URL du script Google externalisée
 * - Synchronisation par lots
 * - Gestion des erreurs renforcée
 * - Documentation complétée
 */

// Configuration
const CONFIG = {
  GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby6ip-Exm_3tLjC1lnxc8ShI4QzNUoIKdr59BANYTwsB6tpIPt43vO1LGF0I4I47NmOHQ/exec',
  MAX_LOCAL_STORAGE_ENTRIES: 100,
  MAX_IMAGE_SIZE_MB: 2,
  SYNC_BATCH_SIZE: 5
};

// Messages (pour internationalisation future)
const MESSAGES = {
  SUCCESS: "✅ Données synchronisées avec Google Sheets !",
  ERROR_SYNC: "⚠️ Synchronisation échouée",
  ERROR_PHOTO_SIZE: "La photo dépasse la taille maximale autorisée",
  SAVE_SUCCESS: "✅ Enregistrement réussi !",
  SAVE_ERROR: "❌ Erreur lors de l'enregistrement"
};

/**
 * 🔄 Convertit un fichier image en base64 avec validation
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

  // Conversion FormData -> Object avec gestion des multi-valeurs
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
    id: Date.now().toString(36) + Math.random().toString(36).substring(2), // ID unique
    timestamp: new Date().toISOString(),
    device: navigator.userAgent,
    synced: false // Marqueur pour la synchronisation
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
    
    // Vérification de la structure
    if (!Array.isArray(storedData)) {
      console.warn("Corruption des données, réinitialisation...");
      storedData = [];
    }

    // Ajout des nouvelles données
    storedData.push(newData);
    
    // Limitation du nombre d'entrées
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
 * ☁️ Synchronise les données avec Google Sheets par lots
 */
async function syncDataWithGoogleSheet() {
  const data = JSON.parse(localStorage.getItem('reponses') || '[]')
    .filter(entry => !entry._metadata?.synced); // Ne sync que les nouvelles entrées

  if (!data.length) return;

  try {
    // Envoi par lots
    for (let i = 0; i < data.length; i += CONFIG.SYNC_BATCH_SIZE) {
      const batch = data.slice(i, i + CONFIG.SYNC_BATCH_SIZE);
      
      await Promise.all(batch.map(async (entry) => {
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry)
        });

        if (!response.ok) throw new Error("Erreur HTTP");

        // Marquer comme synchronisé
        entry._metadata.synced = true;
      }));
    }

    // Mettre à jour le localStorage avec le statut de sync
    const allData = JSON.parse(localStorage.getItem('reponses') || '[]');
    localStorage.setItem('reponses', JSON.stringify(allData));
    
    showMessage(MESSAGES.SUCCESS);
  } catch (error) {
    console.error("Erreur synchronisation:", error);
    showMessage(MESSAGES.ERROR_SYNC, "danger");
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
function initApp() {
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

      // Tentative de sync immédiate si en ligne
      if (navigator.onLine) await syncDataWithGoogleSheet();
    } catch (error) {
      showMessage(`${MESSAGES.SAVE_ERROR}: ${error.message}`, 'danger');
      console.error(error);
    }
  });

  // Vérification périodique de la connexion
  setInterval(() => {
    if (navigator.onLine) syncDataWithGoogleSheet();
  }, 30000); // Toutes les 30 secondes

  // Initialisation
  updateJsonDownloadLink();
  window.addEventListener('online', syncDataWithGoogleSheet);
}

// Démarrage
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

/**
 * 🔒 Déconnexion (à adapter selon le système d'authentification)
 */
function logout() {
  sessionStorage.removeItem('daosar_session');
  window.location.href = 'login.html';
}
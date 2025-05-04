// questionnaire.js - Script complet pour la gestion du formulaire de migration

/**
 * 📍 Obtient la géolocalisation et remplit les champs correspondants
 * @returns {Promise<void>}
 */
async function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        try {
          document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
          document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      error => {
        reject(new Error(`Erreur de géolocalisation : ${error.message}`));
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  });
}

/**
 * 🔄 Convertit un fichier image en base64
 * @param {File} file 
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("La photo ne doit pas dépasser 2MB"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erreur lors de la lecture du fichier"));
    reader.readAsDataURL(file);
  });
}

/**
 * 📋 Collecte et structure les données du formulaire
 * @returns {Promise<Object>}
 */
async function collectFormData() {
  const form = document.getElementById('questionnaireForm');
  const formData = new FormData(form);
  const data = {};

  // Traitement des champs standards
  formData.forEach((value, key) => {
    if (data[key]) {
      data[key] = Array.isArray(data[key]) ? data[key] : [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  });

  // Ajout de la photo si disponible
  const photoInput = document.getElementById('photoInput');
  if (photoInput.files.length > 0) {
    try {
      data.photo = await fileToBase64(photoInput.files[0]);
    } catch (error) {
      throw error;
    }
  }

  // Ajout des métadonnées
  data._metadata = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform
  };

  return data;
}

/**
 * 💾 Sauvegarde les données dans le localStorage
 * @param {Object} newData 
 */
function saveToLocalStorage(newData) {
  try {
    // Charger l'historique existant
    const MAX_ENTRIES = 100;
    let storedData = JSON.parse(localStorage.getItem('reponses') || []);
    
    // Ajouter les nouvelles données
    storedData.push(newData);
    
    // Limiter le nombre d'entrées
    if (storedData.length > MAX_ENTRIES) {
      storedData = storedData.slice(-MAX_ENTRIES);
      showMessage("⚠️ Seules les 100 dernières réponses sont conservées", 'warning');
    }
    
    // Sauvegarder
    localStorage.setItem('reponses', JSON.stringify(storedData));
    return storedData;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      throw new Error("L'espace de stockage local est plein. Veuillez exporter et supprimer des données.");
    }
    throw error;
  }
}

/**
 * 📥 Met à jour le lien de téléchargement JSON
 * @param {Array} data 
 */
function updateJsonDownloadLink(data = null) {
  try {
    const jsonData = data || JSON.parse(localStorage.getItem('reponses') || []);
    if (!jsonData.length) return;

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.getElementById('lienJSON');
    link.href = url;
    link.download = `migration_data_${new Date().toISOString().slice(0, 10)}.json`;
    link.textContent = `📊 Télécharger (${jsonData.length} entrées)`;
    link.style.display = 'inline-block';
  } catch (error) {
    console.error("Erreur lors de la génération du JSON:", error);
  }
}

/**
 * 🟩 Affiche un message à l'utilisateur
 * @param {string} text 
 * @param {string} type 
 */
function showMessage(text, type = 'success') {
  const messageDiv = document.getElementById('message');
  messageDiv.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show">
      ${text}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `;
  
  // Masquage automatique après 5 secondes
  setTimeout(() => {
    const alert = messageDiv.querySelector('.alert');
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 5000);
}

/**
 * 🗑️ Réinitialise le formulaire
 */
function resetForm() {
  document.getElementById('questionnaireForm').reset();
  document.getElementById('progressBar').style.width = '0%';
}

/**
 * ▶️ Initialise l'application
 */
function initApp() {
  // Gestion de la soumission du formulaire
  document.getElementById('questionnaireForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      // Validation
      if (!e.target.checkValidity()) {
        e.target.reportValidity();
        return;
      }

      // Collecte des données
      const formData = await collectFormData();
      
      // Sauvegarde
      const allData = saveToLocalStorage(formData);
      
      // Feedback
      showMessage("✅ Données enregistrées avec succès !");
      updateJsonDownloadLink(allData);
      resetForm();
      
    } catch (error) {
      showMessage(`❌ ${error.message}`, 'danger');
      console.error(error);
    }
  });

  // Bouton de géolocalisation
  document.getElementById('btnGeolocation')?.addEventListener('click', async () => {
    try {
      await getLocation();
      showMessage("📍 Géolocalisation enregistrée");
    } catch (error) {
      showMessage(error.message, 'warning');
    }
  });

  // Initialisation du lien de téléchargement si des données existent
  updateJsonDownloadLink();
}

// Démarrer l'application lorsque le DOM est prêt
if (document.readyState !== 'loading') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}

// Export pour les tests (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getLocation,
    fileToBase64,
    collectFormData,
    saveToLocalStorage,
    updateJsonDownloadLink,
    showMessage
  };
}
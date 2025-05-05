// questionnaire.js - Version corrigée et optimisée

/**
 * 📍 Obtient la géolocalisation et remplit les champs correspondants
 */
async function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Géolocalisation non supportée"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
        document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
        resolve();
      },
      error => reject(new Error(`Erreur géolocalisation: ${error.message}`)),
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

/**
 * 🔄 Convertit un fichier image en base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 2 * 1024 * 1024) return reject(new Error("La photo dépasse 2MB"));

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Erreur lecture fichier"));
    reader.readAsDataURL(file);
  });
}

/**
 * 📋 Collecte et structure les données du formulaire
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
  }

  // Métadonnées
  data._metadata = {
    timestamp: new Date().toISOString(),
    device: navigator.userAgent
  };

  return data;
}

/**
 * 💾 Sauvegarde sécurisée dans le localStorage
 */
function saveToLocalStorage(newData) {
  try {
    // Initialisation garantie d'un tableau vide
    let storedData = [];
    const stored = localStorage.getItem('reponses');
    
    if (stored) {
      try {
        storedData = JSON.parse(stored);
        if (!Array.isArray(storedData)) throw new Error("Invalid data");
      } catch (e) {
        console.error("Corruption des données, réinitialisation...");
        storedData = [];
      }
    }

    // Ajout des nouvelles données
    storedData.push(newData);
    
    // Limitation à 100 entrées
    if (storedData.length > 100) {
      storedData = storedData.slice(-100);
    }
    
    // Sauvegarde sécurisée
    localStorage.setItem('reponses', JSON.stringify(storedData));
    return storedData;
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    throw error;
  }
}

/**
 * 📥 Génère le lien de téléchargement JSON
 */
function updateJsonDownloadLink(data = null) {
  try {
    const jsonData = data || JSON.parse(localStorage.getItem('reponses') || []);
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
      e.target.reportValidity();
      return;
    }

    try {
      const formData = await collectFormData();
      const savedData = saveToLocalStorage(formData);
      
      showMessage("✅ Enregistrement réussi !");
      updateJsonDownloadLink(savedData);
      e.target.reset();
    } catch (error) {
      showMessage(`❌ ${error.message}`, 'danger');
      console.error(error);
    }
  });

  // Géolocalisation
  document.getElementById('btnGeolocation')?.addEventListener('click', async () => {
    try {
      await getLocation();
      showMessage("Position enregistrée");
    } catch (error) {
      showMessage(error.message, 'warning');
    }
  });

  // Initialisation
  updateJsonDownloadLink();
}

// Démarrage
if (document.readyState === 'complete') {
  initApp();
} else {
  document.addEventListener('DOMContentLoaded', initApp);
}
/**
 * 📝 script.js - Gestionnaire avancé de formulaire avec :
 * - Sauvegarde locale (localStorage)
 * - Notifications enrichies
 * - Gestion hors-ligne
 *
 * Dernières améliorations :
 * - Notifications toast + sonores
 * - Gestion des erreurs renforcée
 * - Optimisation des performances
 * - Compatibilité PWA
 */

// Configuration
const CONFIG = {
  MAX_LOCAL_STORAGE_ENTRIES: 100,
  MAX_IMAGE_SIZE_MB: 2,
  NOTIFICATION_TIMEOUT: 5000,
};

// Messages
const MESSAGES = {
  SUCCESS: "✅ Données enregistrées avec succès !",
  ERROR_PHOTO_SIZE: "La photo dépasse 2MB",
  SAVE_SUCCESS: "✅ Enregistrement réussi !",
  SAVE_ERROR: "❌ Erreur lors de l'enregistrement",
  STORAGE_FULL: "⚠️ Espace de stockage insuffisant",
  FORM_SUBMITTED: "📋 Formulaire transmis avec succès",
};

// 🔄 Convertit un fichier image en base64
async function fileToBase64(file) {
  if (!file) return null;

  if (file.size > CONFIG.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new Error(MESSAGES.ERROR_PHOTO_SIZE);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]); // Retire le préfixe data URL
    reader.onerror = () => reject(new Error("Erreur de lecture du fichier"));
    reader.readAsDataURL(file);
  });
}

// 📋 Collecte les données du formulaire
async function collectFormData() {
  const form = document.getElementById("questionnaireForm");
  const formData = new FormData(form);
  const data = {};

  for (const [key, value] of formData.entries()) {
    if (data[key]) {
      data[key] = Array.isArray(data[key]) ? data[key] : [data[key]];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  try {
    const photoFile = document.getElementById("photoInput").files[0];
    if (photoFile) data.photo = await fileToBase64(photoFile);
  } catch (error) {
    console.error("Erreur photo:", error);
    throw error;
  }

  // Métadonnées
  data._metadata = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    device: navigator.userAgent,
    location: await getLocation(),
  };

  return data;
}

// 📍 Récupère la géolocalisation
async function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

// 💾 Sauvegarde locale
function saveToLocalStorage(newData) {
  try {
    let storedData = JSON.parse(localStorage.getItem("reponses") || "[]");

    if (!Array.isArray(storedData)) {
      console.warn("Corruption des données, réinitialisation...");
      storedData = [];
    }

    storedData.push(newData);

    if (storedData.length > CONFIG.MAX_LOCAL_STORAGE_ENTRIES) {
      storedData = storedData.slice(-CONFIG.MAX_LOCAL_STORAGE_ENTRIES);
    }

    localStorage.setItem("reponses", JSON.stringify(storedData));
    return storedData;
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    throw error;
  }
}

// 🔔 Affiche une notification avancée
function showNotification(message, type = "success") {
  const types = {
    success: { icon: "check-circle-fill", bg: "bg-success" },
    error: { icon: "exclamation-triangle-fill", bg: "bg-danger" },
    warning: { icon: "info-circle-fill", bg: "bg-warning" },
  };

  const toast = document.createElement("div");
  toast.className = `toast show ${types[type].bg} text-white`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1100;
    min-width: 250px;
    animation: fadeIn 0.3s;
  `;

  toast.innerHTML = `
    <div class="d-flex align-items-center p-3">
      <i class="bi bi-${types[type].icon} fs-4 me-2"></i>
      <div>${message}</div>
      <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "fadeOut 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.NOTIFICATION_TIMEOUT);

  // Notification via Service Worker si disponible
  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.showNotification(
          type === "success" ? "Succès" : "Erreur",
          {
            body: message,
            icon: "pwa/icon-192.png",
            vibrate: [200, 100, 200],
          }
        );
      })
      .catch((err) => console.log("Service Worker notification failed:", err));
  }
}

// ▶️ Initialisation
async function initApp() {
  const form = document.getElementById("questionnaireForm");
  if (!form) return;

  // ▼ Validation en temps réel ▼
  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      if (field.hasAttribute("required")) {
        const isValid = field.checkValidity();
        field.classList.toggle("is-valid", isValid);
        field.classList.toggle("is-invalid", !isValid);

        if (field.type === "radio" || field.type === "checkbox") {
          validateRadioGroup(field.name);
        }
      }
    });
  });

  // ▼ Gestion unique de la soumission ▼
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    validateAllFields(form);

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      scrollToFirstInvalid();
      return;
    }

    try {
      const formData = await collectFormData();
      const savedData = saveToLocalStorage(formData);

      showNotification(MESSAGES.FORM_SUBMITTED);
      form.reset();
      resetProgressBar();
    } catch (error) {
      showNotification(
        `${
          error.message.includes("QuotaExceeded")
            ? MESSAGES.STORAGE_FULL
            : MESSAGES.SAVE_ERROR
        }: ${error.message}`,
        "error"
      );
    }
  });

  // Demander la permission pour les notifications
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}

// ▼ Fonction de validation unifiée ▼
function validateAllFields(form) {
  form.querySelectorAll("[required]").forEach((field) => {
    const isValid =
      field.type === "radio"
        ? [...form.querySelectorAll(`[name="${field.name}"]`)].some(
            (r) => r.checked
          )
        : field.checkValidity();

    field.classList.toggle("is-valid", isValid);
    field.classList.toggle("is-invalid", !isValid);
  });
}

function validateRadioGroup(name) {
  const group = document.querySelectorAll(`[name="${name}"]`);
  const isGroupValid = [...group].some((el) => el.checked);

  group.forEach((el) => {
    el.classList.toggle("is-valid", isGroupValid);
    el.classList.toggle("is-invalid", !isGroupValid);
  });
}

function scrollToFirstInvalid() {
  const firstInvalid = document.querySelector(".is-invalid");
  if (firstInvalid) {
    firstInvalid.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    firstInvalid.focus();
  }
}

function resetProgressBar() {
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = "0%";
    progressBar.classList.remove("bg-success", "bg-warning");
    progressBar.classList.add("bg-danger");
  }
}

// Démarrage
if (document.readyState === "complete") {
  initApp();
} else {
  document.addEventListener("DOMContentLoaded", initApp);
}

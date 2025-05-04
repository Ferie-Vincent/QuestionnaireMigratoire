
  // 📍 Obtenir la géolocalisation et la remplir dans les champs
  function getLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        document.getElementById('latitude').value = position.coords.latitude.toFixed(6);
        document.getElementById('longitude').value = position.coords.longitude.toFixed(6);
      }, function(error) {
        alert("Erreur de géolocalisation : " + error.message);
      });
    } else {
      alert("La géolocalisation n'est pas supportée par ce navigateur.");
    }
  }

  // ✅ Sauvegarde et traitement du formulaire complet
  function sauvegarderDonnees(event) {
    event.preventDefault(); // empêche le rechargement

    const form = document.getElementById('questionnaireForm');
    const formData = new FormData(form);
    const donnees = {};

    // Traitement des champs simples et multiples
    formData.forEach((value, key) => {
      if (donnees[key]) {
        if (!Array.isArray(donnees[key])) {
          donnees[key] = [donnees[key]];
        }
        donnees[key].push(value);
      } else {
        donnees[key] = value;
      }
    });

    // Traitement de la photo (fichier → base64)
    const photoInput = document.getElementById('photoInput');
    const fichierPhoto = photoInput.files[0];

    if (fichierPhoto) {
      const reader = new FileReader();
      reader.onload = function (e) {
        donnees.photo = e.target.result; // image en base64
        finaliserSauvegarde(donnees);
      };
      reader.readAsDataURL(fichierPhoto);
    } else {
      finaliserSauvegarde(donnees);
    }
  }

  // 💾 Sauvegarde dans localStorage et mise à jour du lien de téléchargement
  function finaliserSauvegarde(donnees) {
    // Charger les anciennes réponses
    let reponses = JSON.parse(localStorage.getItem('reponses') || '[]');
    reponses.push(donnees);

    // Sauvegarde de l'historique complet
    localStorage.setItem('reponses', JSON.stringify(reponses));

    // Mise à jour du lien JSON
    mettreAJourLienJSON(reponses);

    // Message à l'utilisateur
    afficherMessage('✅ Données enregistrées localement !');
    
    // Réinitialisation du formulaire
    document.getElementById('questionnaireForm').reset();
  }

  // 🔁 Met à jour le lien de téléchargement JSON
  function mettreAJourLienJSON(dataArray = null) {
    if (!dataArray) {
      const fromLocal = localStorage.getItem('reponses');
      if (!fromLocal) return;
      dataArray = JSON.parse(fromLocal);
    }

    const blob = new Blob([JSON.stringify(dataArray, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const lien = document.getElementById('lienJSON');
    lien.href = url;
    lien.download = 'formulaire.json';
    lien.textContent = "📄 Télécharger les données JSON";
    lien.style.display = 'inline-block';
  }

  // 🟩 Message d'alerte
  function afficherMessage(texte) {
    document.getElementById("message").innerHTML = `<div class='alert alert-success'>${texte}</div>`;
  }

  // ▶️ Initialisation
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('questionnaireForm').addEventListener('submit', sauvegarderDonnees);
    mettreAJourLienJSON(); // au chargement
  });

  function afficherLocalStorage() {
    const data = localStorage.getItem('reponses');
    document.getElementById('affichageDonnées').textContent = data || 'Aucune donnée trouvée.';
  }

  // Fonction pour préparer un email avec les données en pièce jointe
function preparerEmailAvecDonnees() {
  // Récupérer les données du localStorage
  const donnees = localStorage.getItem('questionnaireData');
  
  if (!donnees) {
    alert("Aucune donnée à envoyer");
    return;
  }
  
  // Créer un blob avec les données
  const blob = new Blob([donnees], { type: 'application/json' });
  
  // Créer un objet URL pour le blob
  const url = URL.createObjectURL(blob);
  
  // Préparer le corps du message
  const corps = "Veuillez trouver ci-joint les données du questionnaire.";
  
  // Créer un lien pour ouvrir le client mail
  const mailtoLink = document.createElement('a');
  mailtoLink.href = `mailto:ekissivincent@gmail.com?subject=Données du questionnaire&body=${encodeURIComponent(corps)}`;
  
  // Ouvrir le client mail
  mailtoLink.click();
  
  // Afficher des instructions pour joindre le fichier manuellement
  alert("Votre client mail va s'ouvrir. Veuillez joindre manuellement le fichier JSON que vous avez téléchargé précédemment.");
}

// Ajouter un bouton pour envoyer par email dans votre interface
function ajouterBoutonEmail() {
  // Créer le bouton
  const boutonEmail = document.createElement('button');
  boutonEmail.type = 'button';
  boutonEmail.className = 'btn btn-info mt-3';
  boutonEmail.textContent = 'Préparer un email avec les données';
  boutonEmail.onclick = preparerEmailAvecDonnees;
  
  // Ajouter le bouton après le lien de téléchargement
  const lienJSON = document.getElementById('lienJSON');
  lienJSON.parentNode.insertBefore(boutonEmail, lienJSON.nextSibling);
  lienJSON.parentNode.insertBefore(document.createElement('br'), boutonEmail);
}

// Modifier la fonction de soumission du formulaire pour ajouter le bouton d'email
document.getElementById('questionnaireForm').addEventListener('submit', function(event) {
  event.preventDefault();
  
  // Récupérer les données du formulaire
  const formData = new FormData(this);
  const formObject = {};
  formData.forEach((value, key) => {
    formObject[key] = value;
  });
  
  // Ajouter la date et l'heure
  formObject.timestamp = new Date().toISOString();
  
  // Récupérer les données existantes du localStorage
  let data = JSON.parse(localStorage.getItem('questionnaireData') || '{"parcours":[]}');
  
  // Ajouter les nouvelles données
  if (!data.parcours) {
    data.parcours = [];
  }
  data.parcours.push(formObject);
  
  // Sauvegarder dans localStorage
  localStorage.setItem('questionnaireData', JSON.stringify(data));
  
  // Créer un fichier JSON téléchargeable
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Configurer le lien de téléchargement
  const lienJSON = document.getElementById('lienJSON');
  lienJSON.href = url;
  lienJSON.download = 'data.json';
  lienJSON.textContent = 'Télécharger les données JSON';
  lienJSON.style.display = 'inline-block';
  
  // Ajouter le bouton d'email
  ajouterBoutonEmail();
  
  // Afficher un message de succès
  document.getElementById('message').innerHTML = 
    '<div class="alert alert-success">Données enregistrées localement. Téléchargez le fichier JSON ou préparez un email.</div>';
});// Fonction améliorée pour préparer un email avec les données en pièce jointe
function preparerEmailAvecDonnees() {
  // Récupérer les données du localStorage
  const donnees = localStorage.getItem('questionnaireData');
  
  if (!donnees) {
    alert("Aucune donnée à envoyer");
    return;
  }
  
  // Créer un blob avec les données
  const blob = new Blob([donnees], { type: 'application/json' });
  
  // Créer un objet URL pour le blob
  const url = URL.createObjectURL(blob);
  
  // Télécharger automatiquement le fichier
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'donnees_questionnaire.json';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Attendre un peu pour que le téléchargement commence
  setTimeout(() => {
    // Préparer le corps du message avec des instructions claires
    const corps = "Bonjour,\n\nVeuillez trouver ci-joint les données du questionnaire que je viens de compléter.\n\nMerci.";
    
    // Créer un lien pour ouvrir le client mail
    const mailtoLink = document.createElement('a');
    mailtoLink.href = `mailto:destinataire@example.com?subject=Données du questionnaire&body=${encodeURIComponent(corps)}`;
    mailtoLink.click();
    
    // Afficher des instructions détaillées
    alert("1. Le fichier JSON a été téléchargé automatiquement\n2. Votre client mail va maintenant s'ouvrir\n3. Veuillez joindre le fichier 'donnees_questionnaire.json' que vous venez de télécharger à votre email");
  }, 500);
}// Fonction améliorée pour préparer un email avec les données en pièce jointe
function preparerEmailAvecDonnees() {
  // Récupérer les données du localStorage
  const donnees = localStorage.getItem('questionnaireData');
  
  if (!donnees) {
    alert("Aucune donnée à envoyer");
    return;
  }
  
  // Créer un blob avec les données
  const blob = new Blob([donnees], { type: 'application/json' });
  
  // Créer un objet URL pour le blob
  const url = URL.createObjectURL(blob);
  
  // Télécharger automatiquement le fichier
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'donnees_questionnaire.json';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  // Attendre un peu pour que le téléchargement commence
  setTimeout(() => {
    // Préparer le corps du message avec des instructions claires
    const corps = "Bonjour,\n\nVeuillez trouver ci-joint les données du questionnaire que je viens de compléter.\n\nMerci.";
    
    // Créer un lien pour ouvrir le client mail
    const mailtoLink = document.createElement('a');
    mailtoLink.href = `mailto:destinataire@example.com?subject=Données du questionnaire&body=${encodeURIComponent(corps)}`;
    mailtoLink.click();
    
    // Afficher des instructions détaillées
    alert("1. Le fichier JSON a été téléchargé automatiquement\n2. Votre client mail va maintenant s'ouvrir\n3. Veuillez joindre le fichier 'donnees_questionnaire.json' que vous venez de télécharger à votre email");
  }, 500);
}

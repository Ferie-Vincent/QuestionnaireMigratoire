// auth.js - Système d'authentification hors ligne

// Clé de chiffrement (à garder secrète en production)
const APP_KEY = 'DAOSAR_SECURE_KEY';

/**
 * Chiffre les données
 */
function encryptData(data) {
  // Note: En production, utilisez une vraie méthode de chiffrement comme AES
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

/**
 * Déchiffre les données
 */
function decryptData(encrypted) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encrypted))));
  } catch {
    return null;
  }
}

/**
 * Initialise le stockage des utilisateurs si vide
 */
function initUserStorage() {
  if (!localStorage.getItem('daosar_users')) {
    // Compte admin par défaut (à changer après la première connexion)
    const defaultUsers = {
      'admin': encryptData({
        password: 'admin123',
        role: 'admin',
        fullName: 'Administrateur DAOSAR'
      })
    };
    localStorage.setItem('daosar_users', JSON.stringify(defaultUsers));
  }
}

/**
 * Vérifie les identifiants de connexion
 */
function authenticate(username, password) {
  const users = JSON.parse(localStorage.getItem('daosar_users') || '{}');
  const userData = users[username] ? decryptData(users[username]) : null;
  
  if (userData && userData.password === password) {
    return {
      username,
      ...userData
    };
  }
  return null;
}

/**
 * Enregistre la session utilisateur
 */
function setUserSession(user) {
  const session = {
    user: user.username,
    role: user.role,
    timestamp: Date.now()
  };
  sessionStorage.setItem('daosar_session', encryptData(session));
}

/**
 * Vérifie si l'utilisateur est authentifié
 */
function checkAuth() {
  const session = sessionStorage.getItem('daosar_session');
  if (!session) return false;
  
  const sessionData = decryptData(session);
  if (!sessionData) return false;
  
  // Vérifie si la session a expiré (8 heures)
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000;
  if (Date.now() - sessionData.timestamp > SESSION_TIMEOUT) {
    sessionStorage.removeItem('daosar_session');
    return false;
  }
  
  return true;
}

/**
 * Redirige vers la page de login si non authentifié
 */
function protectPage() {
  if (!checkAuth() && !window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

/**
 * Initialisation de l'application
 */
function initAuth() {
  initUserStorage();
  
  // Gestion du formulaire de login
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      const user = authenticate(username, password);
      if (user) {
        setUserSession(user);
        window.location.href = 'index.html';
      } else {
        document.getElementById('loginMessage').innerHTML = `
          <div class="alert alert-danger">
            Identifiants incorrects
          </div>
        `;
      }
    });
  }
  
  // Protection des pages
  protectPage();
}

// Démarrage
if (document.readyState === 'complete') {
  initAuth();
} else {
  document.addEventListener('DOMContentLoaded', initAuth);
}
// auth.js
// --- Authentication & GAPI Initialization ---
import { updateUi } from './ui.js';
import { updateStatusTracker } from './status.js';
import { fetchUserBalance, fetchLastPaymentStatus } from './payment.js';

export let userEmail = '';

export function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    discoveryDocs: [
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
      'https://www.googleapis.com/discovery/v1/apis/sheets/v4/rest'
    ],
  });
  await gapi.client.load('oauth2', 'v2');
  handlePageLoad();
}

function handlePageLoad() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const token = {
    'access_token': params.get('access_token'),
    'expires_in': params.get('expires_in')
  };

  const logoutFlag = localStorage.getItem('logout_flag') === 'true';

  if (token.access_token) {
    const expires_at = Date.now() + (parseInt(token.expires_in, 10) * 1000);
    localStorage.setItem('google_auth_token', JSON.stringify({ ...token, expires_at }));
    localStorage.removeItem('logout_flag'); // solo se borra si hay token nuevo
    gapi.client.setToken(token);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    onLoginSuccess();
    return;
  }

  const storedTokenJSON = localStorage.getItem('google_auth_token');
  if (storedTokenJSON) {
    const storedToken = JSON.parse(storedTokenJSON);
    if (storedToken.expires_at > Date.now()) {
      if (!logoutFlag) {
        gapi.client.setToken(storedToken);
        onLoginSuccess();
        return;
      }
    }
  }

  updateUi(false);
}

export async function onLoginSuccess() {
  try {
    const response = await gapi.client.oauth2.userinfo.get();
    userEmail = response.result.email;
    if (!userEmail) throw new Error("No se pudo obtener el email del usuario.");
    updateUi(true);
    await Promise.all([
      fetchUserBalance(userEmail),
      fetchLastPaymentStatus(userEmail).then(status => updateStatusTracker(status))
    ]);
    localStorage.removeItem('logout_flag');
  } catch (error) {
    console.error("Error fetching user data:", error);
    logout();
    alert("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
  }
}

export function logout() {
  userEmail = '';
  localStorage.removeItem('google_auth_token');
  localStorage.setItem('logout_flag', 'true');
  gapi.client.setToken(null);
  updateUi(false);
}
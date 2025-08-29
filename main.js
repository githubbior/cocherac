// main.js
// --- Main Setup ---
import { gapiLoaded, logout } from './auth.js';
import { handleFileUpload, handleAmountInput, submitPayment } from './payment.js';

function waitForGapi() {
  return new Promise((resolve) => {
    const check = () => {
      if (window.gapi && window.gapi.load) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Logout
  document.getElementById('logout-button').addEventListener('click', logout);

  // Login
  document.getElementById('login-button').addEventListener('click', () => {
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = {
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true'
    };
    window.location.href = `${oauth2Endpoint}?${new URLSearchParams(params).toString()}`;
  });

  // File input
  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileUpload(file);
  });

  // Amount input
  const amountInput = document.getElementById('amount-input');
  amountInput.addEventListener('input', (e) => {
    handleAmountInput(e.target.value.trim());
  });

  // Submit button
  document.getElementById('send-button').addEventListener('click', () => {
    const amount = amountInput.value.trim();
    submitPayment(amount);
  });

  // Drag & Drop
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  // Esperar que GAPI esté listo
  waitForGapi().then(() => {
    gapiLoaded();
  });
});
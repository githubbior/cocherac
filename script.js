// --- DOM Elements ---
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const paymentForm = document.getElementById('payment-form');
const dropZone = document.getElementById('drop-zone');
const proofFileInput = document.getElementById('proof-file');
const fileNameDisplay = document.getElementById('file-name-display');
const statusContainer = document.querySelector('.status-container');
const statusTrackerEl = document.querySelector('.status-tracker');
const amountInput = document.getElementById('amount');
const submitButton = paymentForm.querySelector('button[type="submit"]');

// --- Global State ---
let userEmail = '';

// --- GAPI Initialization ---
function gapiLoaded() { gapi.load('client', initializeGapiClient); }

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

// --- Authentication (Redirect Flow with Session Persistence) ---
function handlePageLoad() {
    const params = new URLSearchParams(window.location.hash.substring(1));
    const token = {
        'access_token': params.get('access_token'),
        'expires_in': params.get('expires_in')
    };

    if (token.access_token) {
        const expires_at = Date.now() + (parseInt(token.expires_in, 10) * 1000);
        localStorage.setItem('google_auth_token', JSON.stringify({ ...token, expires_at }));
        gapi.client.setToken(token);
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        onLoginSuccess();
        return;
    }

    const storedTokenJSON = localStorage.getItem('google_auth_token');
    if (storedTokenJSON) {
        const storedToken = JSON.parse(storedTokenJSON);
        if (storedToken.expires_at > Date.now()) {
            gapi.client.setToken(storedToken);
            onLoginSuccess();
            return;
        }
    }
    updateUi(false);
}

loginButton.addEventListener('click', () => {
    const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
    const params = {
        'client_id': GOOGLE_CLIENT_ID, 'redirect_uri': REDIRECT_URI, 'response_type': 'token', 'scope': SCOPES, 'include_granted_scopes': 'true'
    };
    window.location.href = `${oauth2Endpoint}?${new URLSearchParams(params).toString()}`;
});

async function onLoginSuccess() {
    try {
        const response = await gapi.client.oauth2.userinfo.get();
        userEmail = response.result.email;
        if (!userEmail) throw new Error("No se pudo obtener el email del usuario.");
        updateUi(true);
        await Promise.all([
            fetchUserBalance(userEmail),
            fetchLastPaymentStatus(userEmail).then(status => updateStatusTracker(status))
        ]);
    } catch (error) {
        console.error("Error fetching user data:", error);
        logoutButton.click();
        alert("Tu sesión ha expirado o es inválida. Por favor, inicia sesión de nuevo.");
    }
}

logoutButton.addEventListener('click', () => {
    userEmail = '';
    localStorage.removeItem('google_auth_token');
    gapi.client.setToken(null);
    updateUi(false);
});

// --- UI Logic ---
function updateUi(isLoggedIn) {
    if (isLoggedIn) {
        authContainer.style.display = 'none';
        appContainer.style.display = 'block';
        document.getElementById('payment-date').valueAsDate = new Date();
        updateSubmitButtonState();
    } else {
        authContainer.style.display = 'block';
        appContainer.style.display = 'none';
    }
}

// --- Helper Functions ---
function parseInternationalNumber(s) {
    if (typeof s !== 'string') return NaN;
    s = s.trim();
    const sample = (1000.1).toLocaleString(navigator.language);
    const decimalSeparator = sample.charAt(5);
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
    const normalized = s.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '');
    const final = normalized.replace(decimalSeparator, '.');
    return parseFloat(final);
}

function updateSubmitButtonState() {
    submitButton.disabled = proofFileInput.files.length === 0;
}

// --- Status Tracker & Data Fetching Logic ---
function updateStatusTracker(status) {
    const steps = {
        subido: document.getElementById('status-subido'),
        registrado: document.getElementById('status-registrado'),
        validado: document.getElementById('status-validado'),
        final: document.getElementById('status-final'),
    };
    const finalStatusMsg = document.getElementById('final-status-message');
    const finalStates = ['pago recibido', 'pago no recibido', 'aceptado', 'rechazado', 'finalizado'];

    Object.values(steps).forEach(step => step.className = 'step');
    finalStatusMsg.textContent = '';
    finalStatusMsg.style.color = '';
    statusTrackerEl.style.setProperty('--progress-scale', '0');

    if (!status) {
        if (statusContainer) statusContainer.style.display = 'none';
        return;
    }

    if (statusContainer) statusContainer.style.display = 'block';
    const lowerCaseStatus = status.toLowerCase();
    let progressScale = 0;

    if (lowerCaseStatus.includes('subido') || lowerCaseStatus.includes('registrado') || lowerCaseStatus.includes('validado') || finalStates.some(s => lowerCaseStatus.includes(s))) {
        steps.subido.classList.add('completed');
    }
    if (lowerCaseStatus.includes('registrado') || lowerCaseStatus.includes('validado') || finalStates.some(s => lowerCaseStatus.includes(s))) {
        steps.registrado.classList.add('completed');
    }
    if (lowerCaseStatus.includes('validado') || finalStates.some(s => lowerCaseStatus.includes(s))) {
        steps.validado.classList.add('completed');
    }
    if (finalStates.some(s => lowerCaseStatus.includes(s))) {
        steps.final.classList.add('completed');
    }

    if (steps.validado.classList.contains('completed')) {
        progressScale = 1;
    } else if (steps.registrado.classList.contains('completed')) {
        progressScale = 0.5;
    } else {
        progressScale = 0;
    }
    statusTrackerEl.style.setProperty('--progress-scale', progressScale);

    if (finalStates.some(s => lowerCaseStatus.includes(s))) {
      finalStatusMsg.textContent = `Resultado: ${status}`;
      if(lowerCaseStatus.includes('no') || lowerCaseStatus.includes('rechazado')) {
          finalStatusMsg.style.color = '#db4437';
      } else {
          finalStatusMsg.style.color = '#28a745';
      }
    }
}

async function fetchUserBalance(email) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: `${BALANCE_SHEET_NAME}!A:B`,
        });
        const rows = response.result.values || [];
        const userRow = rows.find(row => row[0] === email);
        amountInput.value = (userRow && userRow[1]) ? userRow[1] : '';
    } catch (error) {
        console.error("Error fetching balance:", error);
    }
}

async function fetchLastPaymentStatus(email) {
    try {
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A:G`,
        });
        const allPayments = response.result.values || [];
        const userPayments = allPayments.filter(row => row[0] === email);
        if (userPayments.length === 0) return null;
        userPayments.sort((a, b) => new Date(b[1]) - new Date(a[1]));
        return userPayments[0][6];
    } catch (error) {
        console.error("Error fetching payment status:", error);
        return null;
    }
}

// --- Main Application Logic ---
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando...';
    if (statusContainer) statusContainer.style.display = 'block';

    try {
        if (!userEmail) { throw new Error("User not identified"); }

        const amount = parseInternationalNumber(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, introduce un importe válido y mayor que cero.");
            throw new Error("Invalid amount");
        }

        const paymentDate = document.getElementById('payment-date').value;
        const file = proofFileInput.files[0];
        if (!file) {
            alert('Por favor, selecciona un archivo.');
            throw new Error("No file selected");
        }

        const newStatus = 'Subido';
        updateStatusTracker(newStatus);

        const fileMetadata = { name: file.name, parents: [DRIVE_FOLDER_ID] };
        const uploadResponse = await gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id, webViewLink' });

        const uploadUri = `https://www.googleapis.com/upload/drive/v3/files/${uploadResponse.result.id}?uploadType=media`;
        await fetch(uploadUri, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${gapi.client.getToken().access_token}`, 'Content-Type': file.type },
            body: file,
        });

        const sheetData = { values: [[ userEmail, new Date().toISOString(), paymentDate, amount, file.name, uploadResponse.result.webViewLink, newStatus ]] };
        await gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID, range: `${SHEET_NAME}!A1`, valueInputOption: 'USER_ENTERED', resource: sheetData,
        });

        paymentForm.reset();
        fileNameDisplay.textContent = '';
        updateSubmitButtonState();
        fetchLastPaymentStatus(userEmail).then(status => updateStatusTracker(status));
    } catch (error) {
        console.error('Error durante la subida:', error);
        if (error.message !== "Invalid amount" && error.message !== "No file selected") {
            alert('Ocurrió un error al subir el comprobante: ' + error.message);
        }
        updateStatusTracker(null);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Subir Pago';
        updateSubmitButtonState();
    }
});

// --- Drag and Drop Logic ---
if (dropZone && proofFileInput) {
    dropZone.addEventListener('click', () => proofFileInput.click());

    proofFileInput.addEventListener('change', () => {
        if (proofFileInput.files.length > 0) {
            fileNameDisplay.innerHTML = `Archivo seleccionado: ${proofFileInput.files[0].name} <span class="remove-file-btn" title="Eliminar archivo">&times;</span>`;

            // Add event listener to the new 'x' button
            fileNameDisplay.querySelector('.remove-file-btn').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from bubbling up to the dropZone
                proofFileInput.value = ''; // Clear the file input
                fileNameDisplay.textContent = ''; // Clear the display
                updateSubmitButtonState(); // Re-disable the submit button
            });
        } else {
            fileNameDisplay.textContent = '';
        }
        updateSubmitButtonState();
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); });
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'));
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
    });
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        proofFileInput.files = dt.files;
        proofFileInput.dispatchEvent(new Event('change'));
    });
}

// --- Amount Input Filtering ---
if (amountInput) {
    amountInput.addEventListener('input', (e) => {
        const sanitized = e.target.value.replace(/[^0-9,.]/g, '');
        if (e.target.value !== sanitized) {
            e.target.value = sanitized;
        }
    });
}

// --- Initial Setup ---
console.log("App loaded. Waiting for GAPI to initialize.");
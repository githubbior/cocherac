/*
* ==============================================================================
* == ARCHIVO DE CONFIGURACIÓN Y CREDENCIALES ==
* ==============================================================================
*
* Este archivo contiene todas las credenciales y configuraciones sensibles
* para la aplicación.
*
* **ACCIÓN DE SEGURIDAD IMPORTANTE:**
* Se recomienda encarecidamente que "rotes" tu ID de Cliente en la Consola
* de Google Cloud para invalidar cualquier credencial expuesta en el historial
* de GitHub.
*
*/

// --- Credenciales de Google ---
const GOOGLE_CLIENT_ID = '628625893736-urnhmb7f22k2a0er5iknkl1ksgtf6qur.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email';


// --- IDs de la Aplicación ---
const DRIVE_FOLDER_ID = '17BpeHUamSl1GTu55pU3UIIBkgiP-qFQb';
const SPREADSHEET_ID = '1RNkgaV9vMZHTYw3tC0hdgAToBi2iJm-GwW1_pObIasI';

// --- Nombres de las Hojas ---
const SHEET_NAME = 'Pagos';
const BALANCE_SHEET_NAME = 'Saldos';

// --- URL de Redirección ---
const REDIRECT_URI = 'https://cocherac.netlify.app';

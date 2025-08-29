// payment.js
// --- Payment Submission ---
import { userEmail } from './auth.js';
import { updateSendButtonState } from './ui.js';

let uploadedFile = null;
let validAmount = false;

export function handleFileUpload(file) {
  uploadedFile = file;
  updateSendButtonState(true, validAmount);
}

export function handleAmountInput(amount) {
  validAmount = /^\d+([.,]\d{1,2})?$/.test(amount);
  updateSendButtonState(!!uploadedFile, validAmount);
}

export async function submitPayment(amount) {
  if (!uploadedFile || !validAmount || !userEmail) {
    alert("Faltan datos válidos para enviar el pago.");
    return;
  }

  try {
    const fileMetadata = {
      name: uploadedFile.name,
      mimeType: uploadedFile.type
    };

    const media = {
      mimeType: uploadedFile.type,
      body: uploadedFile
    };

    const driveResponse = await gapi.client.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id'
    });

    const fileId = driveResponse.result.id;
    const sheetData = {
      values: [[userEmail, amount, fileId, new Date().toISOString()]]
    };

    await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Pagos!A1',
      valueInputOption: 'RAW',
      resource: sheetData
    });

    alert("Pago registrado correctamente.");
  } catch (error) {
    console.error("Error al registrar el pago:", error);
    alert("Hubo un problema al registrar el pago.");
  }
}

export async function fetchUserBalance(email) {
  // Implementación opcional si usás Sheets para mostrar saldo
  return;
}

export async function fetchLastPaymentStatus(email) {
  // Implementación opcional si querés mostrar estado previo
  return null;
}
// ui.js
// --- UI Updates ---
export function updateUi(isLoggedIn) {
  document.getElementById('auth-container').style.display = isLoggedIn ? 'none' : 'block';
  document.getElementById('app-container').style.display = isLoggedIn ? 'block' : 'none';
}

export function updateSendButtonState(fileReady, amountReady) {
  const sendButton = document.getElementById('send-button');
  sendButton.disabled = !(fileReady && amountReady);
}
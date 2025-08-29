// status.js
// --- Payment Status Tracker ---
export function updateStatusTracker(status) {
  const tracker = document.getElementById('status-tracker');
  tracker.innerHTML = '';

  const steps = ['Archivo subido', 'Monto validado', 'Escrito en Sheets'];
  const completedSteps = status?.completedSteps || [];

  steps.forEach((step, index) => {
    const stepElement = document.createElement('div');
    stepElement.className = 'tracker-step';
    stepElement.textContent = step;

    if (completedSteps.includes(index)) {
      stepElement.classList.add('completed');
    }

    tracker.appendChild(stepElement);
  });
}
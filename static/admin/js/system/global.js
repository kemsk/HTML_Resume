document.addEventListener('DOMContentLoaded', function () {
  // Utility functions for modals

  function showSuccessModal(message) {
    const modalBody = document.getElementById("successModalBody");
    if (!modalBody) return;
    

    const modalElement = document.getElementById("successModal");
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  function showErrorModal(message) {
    const modalBody = document.getElementById("errorModalBody");
    if (!modalBody) return;
    
    // Always use textContent to prevent HTML injection
    modalBody.textContent = message;

    const modalElement = document.getElementById("errorModal");
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }

  function hideAllModals() {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modalEl => {
      const instance = bootstrap.Modal.getInstance(modalEl);
      if (instance) {
        instance.hide();
      }
    });
  }

  // Optional: Attach utility functions to window or an object for global access
  window.ModalUtils = {
    showSuccessModal,
    showErrorModal,
    hideAllModals
  };
});
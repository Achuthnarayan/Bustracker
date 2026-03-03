// UI Helper Functions
class UI {
  
  static showPopup(message, type = 'success') {
    const popup = document.getElementById('popup');
    if (!popup) return;
    
    popup.innerText = message;
    popup.className = `popup popup-${type}`;
    popup.style.display = 'block';
    
    setTimeout(() => {
      popup.style.display = 'none';
    }, 3000);
  }
  
  static showError(message) {
    this.showPopup(message, 'error');
  }
  
  static showSuccess(message) {
    this.showPopup(message, 'success');
  }
  
  static showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.disabled = true;
      element.innerHTML = '<span class="spinner"></span> Loading...';
    }
  }
  
  static hideLoading(elementId, originalText) {
    const element = document.getElementById(elementId);
    if (element) {
      element.disabled = false;
      element.innerHTML = originalText;
    }
  }
  
  static setInputError(inputId, message) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.classList.add('input-error');
    
    let errorDiv = input.nextElementSibling;
    if (!errorDiv || !errorDiv.classList.contains('error-message')) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      input.parentNode.insertBefore(errorDiv, input.nextSibling);
    }
    errorDiv.textContent = message;
  }
  
  static clearInputError(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.classList.remove('input-error');
    
    const errorDiv = input.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('error-message')) {
      errorDiv.remove();
    }
  }
  
  static clearAllErrors() {
    document.querySelectorAll('.input-error').forEach(input => {
      input.classList.remove('input-error');
    });
    document.querySelectorAll('.error-message').forEach(msg => {
      msg.remove();
    });
  }
}

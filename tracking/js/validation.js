// Input Validation Module
class Validator {
  
  static validateEmail(email) {
    if (!email || email.trim() === '') {
      return { valid: false, message: 'Email is required' };
    }
    if (!CONFIG.VALIDATION.EMAIL_PATTERN.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }
    return { valid: true };
  }
  
  static validatePhone(phone) {
    if (!phone || phone.trim() === '') {
      return { valid: false, message: 'Phone number is required' };
    }
    const cleaned = phone.replace(/\D/g, '');
    if (!CONFIG.VALIDATION.PHONE_PATTERN.test(cleaned)) {
      return { valid: false, message: 'Invalid phone number. Must be 10 digits starting with 6-9' };
    }
    return { valid: true, value: cleaned };
  }
  
  static validateCollegeId(id) {
    if (!id || id.trim() === '') {
      return { valid: false, message: 'College ID is required' };
    }
    const cleaned = id.trim().toUpperCase();
    if (!CONFIG.VALIDATION.COLLEGE_ID_PATTERN.test(cleaned)) {
      return { valid: false, message: 'Invalid College ID format' };
    }
    return { valid: true, value: cleaned };
  }
  
  static validatePassword(password) {
    if (!password || password.trim() === '') {
      return { valid: false, message: 'Password is required' };
    }
    if (password.length < CONFIG.VALIDATION.PASSWORD_MIN_LENGTH) {
      return { valid: false, message: `Password must be at least ${CONFIG.VALIDATION.PASSWORD_MIN_LENGTH} characters` };
    }
    return { valid: true };
  }
  
  static validateName(name) {
    if (!name || name.trim() === '') {
      return { valid: false, message: 'Name is required' };
    }
    if (name.trim().length < 2) {
      return { valid: false, message: 'Name must be at least 2 characters' };
    }
    return { valid: true, value: name.trim() };
  }
  
  static validateBusNumber(busNumber) {
    if (!busNumber || busNumber.trim() === '') {
      return { valid: false, message: 'Bus number is required' };
    }
    const cleaned = busNumber.trim().toUpperCase();
    if (!CONFIG.VALIDATION.BUS_NUMBER_PATTERN.test(cleaned)) {
      return { valid: false, message: 'Invalid bus number format' };
    }
    return { valid: true, value: cleaned };
  }
  
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

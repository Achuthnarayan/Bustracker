// Session Management Module
class SessionManager {
  
  static setToken(token) {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + CONFIG.SESSION.EXPIRY_HOURS);
    
    localStorage.setItem(CONFIG.SESSION.TOKEN_KEY, token);
    localStorage.setItem(`${CONFIG.SESSION.TOKEN_KEY}_expiry`, expiry.toISOString());
  }
  
  static getToken() {
    const token = localStorage.getItem(CONFIG.SESSION.TOKEN_KEY);
    const expiry = localStorage.getItem(`${CONFIG.SESSION.TOKEN_KEY}_expiry`);
    
    if (!token || !expiry) return null;
    
    if (new Date() > new Date(expiry)) {
      this.clearSession();
      return null;
    }
    
    return token;
  }
  
  static setUser(user) {
    localStorage.setItem(CONFIG.SESSION.USER_KEY, JSON.stringify(user));
  }
  
  static getUser() {
    const user = localStorage.getItem(CONFIG.SESSION.USER_KEY);
    return user ? JSON.parse(user) : null;
  }
  
  static isAuthenticated() {
    return this.getToken() !== null;
  }
  
  static clearSession() {
    localStorage.removeItem(CONFIG.SESSION.TOKEN_KEY);
    localStorage.removeItem(`${CONFIG.SESSION.TOKEN_KEY}_expiry`);
    localStorage.removeItem(CONFIG.SESSION.USER_KEY);
  }
  
  static requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }
}

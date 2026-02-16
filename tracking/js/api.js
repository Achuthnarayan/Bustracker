// API Communication Module
class API {
  
  static async request(endpoint, method = 'GET', data = null) {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const token = SessionManager.getToken();
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }
      
      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
  
  // Authentication APIs
  static async login(collegeId, password) {
    return await this.request('/auth/login', 'POST', { collegeId, password });
  }
  
  static async register(userData) {
    return await this.request('/auth/register', 'POST', userData);
  }
  
  static async logout() {
    return await this.request('/auth/logout', 'POST');
  }
  
  // Bus Tracking APIs
  static async getBusLocation(busNumber) {
    return await this.request(`/buses/${busNumber}/location`);
  }
  
  static async getAllBuses() {
    return await this.request('/buses');
  }
  
  static async getRoutes() {
    return await this.request('/routes');
  }
  
  static async searchBus(query) {
    return await this.request(`/buses/search?q=${encodeURIComponent(query)}`);
  }
  
  // Ticket APIs
  static async purchaseTicket(ticketData) {
    return await this.request('/tickets/purchase', 'POST', ticketData);
  }
  
  static async getMyTickets() {
    return await this.request('/tickets/my');
  }
  
  // Hardware Integration APIs (for ESP32)
  static async updateBusLocation(busId, locationData) {
    return await this.request('/hardware/location', 'POST', {
      busId,
      latitude: locationData.lat,
      longitude: locationData.lng,
      speed: locationData.speed || 0,
      heading: locationData.heading || 0,
      timestamp: new Date().toISOString()
    });
  }
  
  static async getBusStatus(busId) {
    return await this.request(`/hardware/status/${busId}`);
  }
}

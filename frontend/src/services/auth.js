// Authentication helper functions
export const authService = {
  // Store JWT token
  setToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  // Get JWT token
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  // Remove JWT token
  removeToken: () => {
    localStorage.removeItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    if (!token) return false;
    
    try {
      // Basic JWT expiration check (decode without verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      
      if (payload.exp < currentTime) {
        localStorage.removeItem('authToken');
        return false;
      }
      
      return true;
    } catch (error) {
      localStorage.removeItem('authToken');
      return false;
    }
  },

  // Get user info from token
  getUserFromToken: () => {
    const token = localStorage.getItem('authToken');
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { id: payload.id };
    } catch (error) {
      return null;
    }
  }
};
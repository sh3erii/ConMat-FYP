// ============================================================
//  src/context/AuthContext.jsx
//  Global auth state – wraps the whole app
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on app start
  useEffect(() => {
    const savedToken = localStorage.getItem('conmat_token');
    const savedUser  = localStorage.getItem('conmat_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('conmat_token', jwtToken);
    localStorage.setItem('conmat_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('conmat_token');
    localStorage.removeItem('conmat_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook – use this anywhere in the app
export const useAuth = () => useContext(AuthContext);

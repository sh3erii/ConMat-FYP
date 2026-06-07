// ============================================================
//  src/context/AuthContext.jsx
//  Global auth state – wraps the whole app
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

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

  const loginRequest = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data?.user && data?.token) {
      login(data.user, data.token);
    }
    return data;
  };

  const registerRequest = async (payload) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(key, value);
    });

    // We omit the Content-Type header so Axios/Browser can automatically
    // generate the correct multipart/form-data header with the boundary
    const { data } = await api.post('/auth/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, loginRequest, registerRequest }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook – use this anywhere in the app
export const useAuth = () => useContext(AuthContext);

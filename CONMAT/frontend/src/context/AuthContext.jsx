import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'conmat_token';
const USER_KEY = 'conmat_user';

export const safeParseUser = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

export const getSavedToken = () => sessionStorage.getItem(TOKEN_KEY);
export const getSavedUser = () => safeParseUser(sessionStorage.getItem(USER_KEY));

const clearSavedSession = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getSavedUser);
  const [token, setToken] = useState(getSavedToken);
  const [loading, setLoading] = useState(() => Boolean(getSavedToken() || getSavedUser()));

  useEffect(() => {
    let active = true;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    const validateSavedSession = async () => {
      const savedToken = getSavedToken();
      const savedUser = getSavedUser();

      if (!savedToken || !savedUser) {
        clearSavedSession();
        if (active) {
          setUser(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
          skipAuthRedirect: true,
        });
        const nextUser = data.user || data.data;
        if (!nextUser) throw new Error('The saved session did not return a user.');
        if (!active) return;

        setUser(nextUser);
        setToken(savedToken);
        sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      } catch {
        if (!active) return;
        setUser(null);
        setToken(null);
        clearSavedSession();
      } finally {
        if (active) setLoading(false);
      }
    };

    validateSavedSession();
    return () => { active = false; };
  }, []);

  const saveSession = useCallback((userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    setLoading(false);
    sessionStorage.setItem(TOKEN_KEY, jwtToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  const login = useCallback((userData, jwtToken) => saveSession(userData, jwtToken), [saveSession]);

  const loginRequest = useCallback(async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveSession(data.user, data.token);
    return data;
  }, [saveSession]);

  const registerRequest = useCallback(async (payload) => {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;

      if (value instanceof File) {
        formData.append(key, value);
        return;
      }

      formData.append(key, String(value));
    });

    const { data } = await api.post('/auth/register', formData, { timeout: 60000 });
    return data;
  }, []);

  const verifyRegistrationOtp = useCallback(async ({ email, otp }) => {
    const { data } = await api.post('/auth/register/verify-otp', { email, otp });
    return data;
  }, []);

  const resendRegistrationOtp = useCallback(async (email) => {
    const { data } = await api.post('/auth/register/resend-otp', { email }, { timeout: 30000 });
    return data;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    const nextUser = data.user || data.data;
    if (nextUser) {
      setUser(nextUser);
      sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    }
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setLoading(false);
    clearSavedSession();
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    loginRequest,
    registerRequest,
    verifyRegistrationOtp,
    resendRegistrationOtp,
    refreshUser,
    logout,
  }), [user, token, loading, login, loginRequest, registerRequest, verifyRegistrationOtp, resendRegistrationOtp, refreshUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

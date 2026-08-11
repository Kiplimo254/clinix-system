import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Staff profile
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Just try to fetch Me. If we have a valid cookie, it works.
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    setError(null);
    await authApi.login({ username: email, password });
    await fetchMe();
  };

  const logout = async () => {
    try { await authApi.logout(); } catch (_) {}
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isDoctor: user?.role === 'doctor',
    isNurse: user?.role === 'nurse',
    isReceptionist: user?.role === 'receptionist',
    clinicName: user?.clinic_name,
    clinicId: user?.clinic_id,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

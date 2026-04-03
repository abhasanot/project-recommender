import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

interface User { id: number; email: string; name: string; user_type: 'student' | 'faculty'; }
interface AuthContextType {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login  = async (email: string, password: string) => { const r = await api.post('/auth/login',  { email, password }); setUser(r.data.user); };
  const signup = async (data: any)                        => { const r = await api.post('/auth/signup', data);               setUser(r.data.user); };
  const logout = async ()                                  => { await api.post('/auth/logout'); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
};

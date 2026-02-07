import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  linkedinConnected: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mock user for bypass
  const mockUser: User = {
    id: 'mock-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
    avatar: null,
    linkedinConnected: false,
  };

  const [user] = useState<User | null>(mockUser);
  const [isLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('token', 'demo-token');
  }, []);

  // No-op functions for auth actions
  const login = async (_email: string, _password: string) => {
    toast.success('Welcome back! (Demo Mode)');
  };

  const register = async (_email: string, _password: string, _name: string) => {
    toast.success('Account created! (Demo Mode)');
  };

  const logout = () => {
    toast.info('Logout disabled in Demo Mode');
  };

  const fetchUser = async () => {
    // No-op
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: true, // Always authenticated
        login,
        register,
        logout,
        refetchUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

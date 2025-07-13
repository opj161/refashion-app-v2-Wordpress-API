
// src/contexts/AuthContext.tsx
"use client";

import type ReactType from 'react';
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, logoutUser } from '@/actions/authActions';
import type { SessionUser } from '@/lib/types';

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean; // Represents loading for explicit refreshes, not initial load if initialUser is provided
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
  initialUser: SessionUser | null; // Prop to pass initial user state
}

export const AuthProvider = ({ children, initialUser }: AuthProviderProps) => {
  // Initialize user state with the server-provided initialUser
  const [user, setUser] = useState<SessionUser | null>(initialUser);

  // 2. The only "loading" state is for manual refreshes, not initial load.
  const [loading, setLoading] = useState(false);

  // 3. This effect is now only for syncing with layout re-renders, not for fetching.
  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  // The refreshUser function remains to allow explicit session re-fetching.
  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const currentUserData = await getCurrentUser();
      setUser(currentUserData);
    } catch (error) {
      console.error("Failed to refresh user session", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = { user, loading, refreshUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// UserAuthStatus component remains largely the same but benefits from faster initial user state
export const UserAuthStatus = () => {
  const { user, loading: authContextLoading } = useAuth(); // Renamed loading to avoid conflict
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  // Show loading if AuthContext is loading (e.g. during a refresh) OR if not yet client-side rendered
  if (authContextLoading || !isClient) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (user?.isLoggedIn) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>
        <form action={logoutUser}>
          <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            Logout
          </Button>
        </form>
      </div>
    );
  }
  
  // If not logged in, show login button
  return (
    <Button asChild variant="default" size="sm">
      <a href="/login">Login</a>
    </Button>
  );
};

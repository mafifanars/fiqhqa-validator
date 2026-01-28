"use client";

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';

export interface UseUserResult {
  user: User | null;
  isLoading: boolean;
}

/**
 * Custom hook to get user data from localStorage.
 * This replaces the Firebase Auth-based useUser hook.
 */
export const useUser = (): UseUserResult => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        setUser(JSON.parse(userJson));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }

    // Optional: Add a storage event listener to sync across tabs
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user') {
        try {
            if (event.newValue) {
                setUser(JSON.parse(event.newValue));
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { user, isLoading };
};

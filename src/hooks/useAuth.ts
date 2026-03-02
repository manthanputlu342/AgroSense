// src/hooks/useAuth.ts

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthChange } from '../services/firebase';

// This custom hook provides the current authentication state and user object.
export function useAuth() {
  // State to hold the current user and loading status.
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe to authentication state changes when the component mounts.
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // Unsubscribe from the listener when the component unmounts.
    return () => unsubscribe();
  }, []);

  return { user, loading };
}

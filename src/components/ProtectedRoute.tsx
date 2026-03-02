// src/components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// This component protects routes that require authentication.
// It redirects unauthenticated users to the login page.
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // While checking authentication state, show a loading message.
  if (loading) {
    return <div>Loading...</div>;
  }

  // If the user is authenticated, render the requested component.
  if (user) {
    return children;
  }

  // If the user is not authenticated, redirect to the login page.
  return <Navigate to="/login" replace />;
}

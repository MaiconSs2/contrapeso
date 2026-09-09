import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  if (loading) return <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">Carregando…</div>;
  return isAuthed ? children : <Navigate to="/login" replace />;
}
